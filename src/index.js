import _ from 'lodash';
import async from 'async';
import urlParser from 'url';
import request from 'request';
import WebSocket from 'ws';
import changeCase from 'change-case';

// constants
const PORT = '8088';
const TIMEOUT = 10000;
const PING_INTERVAL = 10000;
const ENGINE = 'vnd.logitech.harmony/vnd.logitech.harmony.engine';
const EVENT_NOTIFY = 'connect.stateDigest?notify';

// private vars
const _ip = Symbol('ip');
const _msgId = Symbol('msgId');
const _hubId = Symbol('hubId');
const _socket = Symbol('socket');
const _queue = Symbol('queue');
const _config = Symbol('config');
const _callbacks = Symbol('callbacks');
const _timeouts = Symbol('timeouts');
const _started = Symbol('started');
const _lastActivityId = Symbol('lastActivityId');
const _pingCount = Symbol('pingCount');

// private methods
const _initSocket = Symbol('initSocket');
const _getConfig = Symbol('getConfig');
const _runCmd = Symbol('runCmd');
const _pressButton = Symbol('pressButton');
const _handleNotify = Symbol('handleNotify');
const _resetSocket = Symbol('resetSocket');

class HarmonyHub {
	constructor(ip) {
		this[_ip] = ip;
		this[_msgId] = 1000;
		this[_hubId] = null;
		this[_socket] = null;
		this[_started] = false;
		this[_lastActivityId] = null;
		this[_pingCount] = 0;
		this[_queue] = [];
		this[_config] = {};
		this[_timeouts] = {};
		this[_callbacks] = {};
	}

	[_initSocket](callback) {
		if (this[_socket]) return callback();
		if (this[_started]) return this[_queue].push(callback);
		this[_started] = true;

		const config = {
			url: `http://${this[_ip]}:${PORT}`,
			method: 'POST',
			headers: {
				Origin: 'http://localhost.nebula.myharmony.com',
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'Accept-Charset': 'utf-8',
			},
			body: {
				id: 1,
				cmd: 'connect.discoveryinfo?get',
				params: {},
			},
			json: true,
		};

		request(config, (err, response, body) => {
			if (err) return callback(err);
			const hubId = _.get(body, 'data.remoteId', false);
			const url = _.get(body, 'data.discoveryServerUri', '');
			if (!hubId) return callback('Hub not found');
			const domain = urlParser.parse(url).hostname;
			const wsUrl = `ws://${this[_ip]}:${PORT}/?domain=${domain}&hubId=${hubId}`;
			const socket = new WebSocket(wsUrl);
			this[_hubId] = hubId;

			socket.on('open', (err) => {
				if (err) return callback(err);
				this[_socket] = socket;
				this[_timeouts].socket = setInterval(() => {
					socket.ping();
					this[_pingCount]++;
					if (this[_pingCount] >= 2) this[_resetSocket]();
				}, PING_INTERVAL);
				this[_getConfig]((err) => {
					callback(err);
					this[_queue].forEach((cb) => cb(err));
					this[_queue].length = 0;
				});
			});

			socket.on('message', (data) => {
				try {
					const ob = JSON.parse(data);
					const { id, type } = ob;
					if (type === EVENT_NOTIFY) this[_handleNotify](ob);
					if (this[_callbacks][id]) {
						clearTimeout(this[_timeouts][id]);
						this[_callbacks][id](null, ob);
						this[_callbacks][id] = null;
					}
				} catch (err) {}
			});

			socket.on('pong', () => {
				this[_pingCount] = 0;
			});

			socket.on('close', () => {
				this[_resetSocket](false);
			});
		});
	}

	[_resetSocket](close = true) {
		if (close && this[_socket]) this[_socket].close();
		this[_socket] = null;
		this[_started] = false;
		clearInterval(this[_timeouts].socket);
	}

	[_getConfig](callback) {
		const cmd = `${ENGINE}?config`;
		const params = { verb: 'get', format: 'json' };
		this[_runCmd]({ cmd, params }, (err, ob) => {
			this[_config] = ob;
			callback(err);
		});
	}

	[_runCmd](ops, callback) {
		this[_initSocket]((err) => {
			if (err) return callback(err);
			const { cmd, params, wait } = ops;
			const id = this[_msgId]++;
			const payload = {
				hubId: this[_hubId],
				timeout: Math.floor(TIMEOUT / 1000),
				hbus: { cmd, id, params },
			};
			this[_socket].send(JSON.stringify(payload));
			if (wait === false) return callback();
			this[_callbacks][id] = callback;
			this[_timeouts][id] = setTimeout((id) => {
				if (this[_callbacks][id]) {
					this[_callbacks][id]('Request timed out');
				}
			}, TIMEOUT);
		});
	}

	[_handleNotify](ob) {
		if (!_.isFunction(this[_callbacks].onActivityStarted)) return;
		const status = _.get(ob, 'data.activityStatus');
		if (![0, 1].includes(status)) return;
		const id = _.get(ob, 'data.activityId', false);
		if (id === false || this[_lastActivityId] === id) return;
		this[_lastActivityId] = id;
		this.getActivities()
			.then((activities) => {
				const activity = _.find(activities, { id });
				if (activity) this[_callbacks].onActivityStarted(activity);
			})
			.catch(() => {});
	}

	[_pressButton](button, duration, callback) {
		const cmd = `${ENGINE}?holdAction`;
		const interval = 200;
		const run = (status, cb) => {
			const params = {
				timestamp: 0,
				verb: 'render',
				status,
				action: button.action,
			};
			this[_runCmd]({ cmd, params, wait: false }, (err) => {
				if (err) return cb(err);
				setTimeout(cb, interval);
			});
		};
		const list = ['press'];
		const times = Math.floor(duration / interval);
		for (let i = 0; i <= times; i++) list.push('hold');
		list.push('release');
		async.eachSeries(list, run, callback);
	}

	getActivities() {
		return new Promise((resolve, reject) => {
			this[_initSocket]((err) => {
				if (err) return reject(err);
				const activities = _.get(this[_config], 'data.activity');
				if (!activities) return reject('Activities not found');
				const list = [];
				activities.forEach((activity) => {
					const { id, label } = activity;
					const name = id === '-1' ? 'off' : changeCase.snake(_.trim(label));
					list.push({ id, name, label });
				});
				resolve(list);
			});
		});
	}

	startActivity(id) {
		id = changeCase.snake(_.trim(id));
		return new Promise((resolve, reject) => {
			this.getActivities()
				.then((activities) => {
					let activity = _.find(activities, { name: id });
					if (!activity) activity = _.find(activities, { id });
					if (!activity) return reject('Activity not found');
					const cmd = 'harmony.activityengine?runactivity';
					const params = {
						async: 'false',
						timestamp: 0,
						args: { rule: 'start' },
						activityId: activity.id,
					};
					this[_runCmd]({ cmd, params }, (err) => {
						if (err) return reject(err);
						resolve(activity);
					});
				})
				.catch((err) => reject(err));
		});
	}

	getCurrentActivity() {
		return new Promise((resolve, reject) => {
			const cmd = `${ENGINE}?getCurrentActivity`;
			const params = { verb: 'get', format: 'json' };
			this[_runCmd]({ cmd, params }, (err, ob) => {
				if (err) return reject(err);
				const id = _.get(ob, 'data.result');
				if (!id) return reject('Activity not found');
				this.getActivities()
					.then((activities) => {
						const activity = _.find(activities, { id });
						if (!activity) return reject('Activity not found');
						resolve(activity);
					})
					.catch((err) => reject(err));
			});
		});
	}

	onActivityStarted(callback) {
		this[_initSocket](() => {
			this[_callbacks].onActivityStarted = callback;
		});
	}

	turnOff() {
		return this.startActivity('off');
	}

	refresh() {
		return new Promise((resolve, reject) => {
			this[_getConfig]((err) => {
				if (err) return reject(err);
				this.getActivities()
					.then(resolve)
					.catch(reject);
			});
		});
	}

	pressButton(name, duration = 0) {
		name = _.trim(name);
		const nameTitle = changeCase.title(name);
		const nameNoSpaces = nameTitle.replace(/\s/g, '');
		return new Promise((resolve, reject) => {
			this.getCurrentActivity()
				.then(({ id, name }) => {
					if (name === 'off') return reject('No activity currently running');
					const activities = _.get(this[_config], 'data.activity');
					if (!activities) return reject('Activities not found');
					const activity = _.find(activities, { id });
					if (!activity || !activity.controlGroup) return reject('Activity not found');
					let button = null;
					for (let i = 0; i < activity.controlGroup.length; i++) {
						const group = activity.controlGroup[i];
						button = _.find(group.function, { name: nameNoSpaces });
						if (!button) button = _.find(group.function, { label: nameTitle });
						if (button) break;
					}
					if (!button) return reject('Button not found');
					this[_pressButton](button, duration, (err) => {
						if (err) return reject(err);
						resolve({
							name: changeCase.snake(button.name),
							label: button.label,
							duration,
						});
					});
				})
				.catch((err) => reject(err));
		});
	}
}

export default HarmonyHub;
module.exports = HarmonyHub;
