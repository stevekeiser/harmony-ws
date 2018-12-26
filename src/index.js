import _ from 'lodash';
import urlParser from 'url';
import request from 'request';
import WebSocket from 'ws';

const PORT = '8088';
const MSG_ID = 54321;
const TIMEOUT = 10000;
const ENGINE = 'vnd.logitech.harmony/vnd.logitech.harmony.engine';
const NOTIFY = 'connect.stateDigest?notify';

const getHubInfo = (ip, callback) => {
	const config = {
		url: `http://${ip}:${PORT}`,
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
		const { remoteId, discoveryServerUri } = body.data;
		const domain = urlParser.parse(discoveryServerUri).hostname;
		const url = `ws://${ip}:${PORT}/?domain=${domain}&hubId=${remoteId}`;
		callback(null, { url, remoteId });
	});
};

const runCmd = (ip, cmd, params, callback, ops = {}) => {
	let pending = true;
	ops.repeat = ops.repeat || 1;

	const timeout = setTimeout(() => {
		pending = false;
		callback('Command timed out');
	}, TIMEOUT);

	const done = (err, result) => {
		clearTimeout(timeout);
		if (pending) callback(err, result);
	};

	getHubInfo(ip, (err, { url, remoteId }) => {
		if (err) return done(err);

		const socket = new WebSocket(url);

		socket.on('open', (err) => {
			if (err) return done(err);
			const payload = {
				hubId: remoteId,
				timeout: Math.floor(TIMEOUT / 1000),
				hbus: { cmd, id: MSG_ID, params },
			};
			for (let i = 0; i <= ops.repeat; i++) {
				socket.send(JSON.stringify(payload));
			}
			if (ops.wait === false) {
				done();
				socket.close();
			}
		});

		socket.on('message', (data) => {
			const ob = JSON.parse(data);
			if (ob.id === MSG_ID) {
				done(null, ob);
				socket.close();
			}
		});
	});
};

class HarmonyHub {
	constructor(ip) {
		this.ip = ip;
	}

	getActivities(digest = true) {
		return new Promise((resolve, reject) => {
			const cmd = `${ENGINE}?config`;
			const params = { verb: 'get', format: 'json' };
			runCmd(this.ip, cmd, params, (err, ob) => {
				if (err) return reject(err);
				const activities = _.get(ob, 'data.activity');
				if (!activities) return reject('Activities not found');
				if (!digest) return resolve(activities);
				const list = [];
				activities.forEach((activity) => {
					const { id, label } = activity;
					list.push({ id, label });
				});
				resolve(list);
			});
		});
	}

	runActivity(id) {
		id = _.trim(id);
		return new Promise((resolve, reject) => {
			const cmd = 'harmony.activityengine?runactivity';
			const params = {
				async: 'false',
				timestamp: 0,
				args: { rule: 'start' },
				activityId: id,
			};
			runCmd(this.ip, cmd, params, (err, ob) => {
				if (err) return reject();
				resolve();
			});
		});
	}

	getCurrentActivity() {
		return new Promise((resolve, reject) => {
			const cmd = `${ENGINE}?getCurrentActivity`;
			const params = { verb: 'get', format: 'json' };
			runCmd(this.ip, cmd, params, (err, ob) => {
				if (err) return reject(err);
				const activityId = _.get(ob, 'data.result');
				if (!activityId) return reject('Activity not found');
				resolve(activityId);
			});
		});
	}

	onActivityStarted(callback) {
		getHubInfo(this.ip, (err, { url }) => {
			if (err) return;
			let lastActivityId = null;
			const socket = new WebSocket(url);
			socket.on('message', (data) => {
				const ob = JSON.parse(data);
				const activityId = _.get(ob, 'data.activityId', false);
				if (ob.type === NOTIFY && activityId !== false && lastActivityId !== activityId) {
					lastActivityId = activityId;
					callback(activityId);
				}
			});
		});
	}

	// todo: cache socket and config information
	pressButton(button, repeat = 1) {
		button = _.trim(button);
		repeat = parseInt(repeat);
		if (repeat < 1) repeat = 1;
		return new Promise((resolve, reject) => {
			if (repeat > 100) return reject(`Repeat can't be above 100`);
			this.getCurrentActivity()
				.then((id) => {
					if (id === '-1') return reject('No running activity');
					this.getActivities(false)
						.then((list) => {
							const activity = _.find(list, { id });
							if (!activity) return reject('Activity not found');
							let item = null;
							for (let i = 0; i < activity.controlGroup.length; i++) {
								const group = activity.controlGroup[i];
								item = _.find(group.function, { name: button });
								if (item) break;
							}
							if (!item) return reject('Button not found');
							const cmd = `${ENGINE}?holdAction`;
							const params = {
								timestamp: 0,
								verb: 'render',
								status: 'press',
								action: item.action,
							};
							runCmd(this.ip, cmd, params, resolve, { wait: false, repeat });
						})
						.catch((err) => reject(err));
				})
				.catch((err) => reject(err));
		});
	}
}

export default HarmonyHub;
module.exports = HarmonyHub;
