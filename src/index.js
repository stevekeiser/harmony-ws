import _ from 'lodash';
import urlParser from 'url';
import request from 'request';
import WebSocket from 'ws';

const PORT = '8088';
const MSG_ID = 54321;
const TIMEOUT = 10000;
const ENGINE = 'vnd.logitech.harmony/vnd.logitech.harmony.engine';

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

const runCmd = (ip, cmd, params, callback) => {
	let pending = true;

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
			socket.send(JSON.stringify(payload));
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

	getActivities() {
		return new Promise((resolve, reject) => {
			const cmd = `${ENGINE}?config`;
			const params = { verb: 'get', format: 'json' };
			runCmd(this.ip, cmd, params, (err, ob) => {
				if (err) return reject(err);
				const activities = _.get(ob, 'data.activity');
				if (!activities) return reject('Activities not found');
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
}

export default HarmonyHub;
module.exports = HarmonyHub;