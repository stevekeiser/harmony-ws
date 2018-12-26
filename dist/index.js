'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PORT = '8088';
var MSG_ID = 54321;
var TIMEOUT = 10000;
var ENGINE = 'vnd.logitech.harmony/vnd.logitech.harmony.engine';
var NOTIFY = 'connect.stateDigest?notify';

var getHubInfo = function getHubInfo(ip, callback) {
	var config = {
		url: 'http://' + ip + ':' + PORT,
		method: 'POST',
		headers: {
			Origin: 'http://localhost.nebula.myharmony.com',
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'Accept-Charset': 'utf-8'
		},
		body: {
			id: 1,
			cmd: 'connect.discoveryinfo?get',
			params: {}
		},
		json: true
	};
	(0, _request2.default)(config, function (err, response, body) {
		if (err) return callback(err);
		var _body$data = body.data,
		    remoteId = _body$data.remoteId,
		    discoveryServerUri = _body$data.discoveryServerUri;

		var domain = _url2.default.parse(discoveryServerUri).hostname;
		var url = 'ws://' + ip + ':' + PORT + '/?domain=' + domain + '&hubId=' + remoteId;
		callback(null, { url: url, remoteId: remoteId });
	});
};

var runCmd = function runCmd(ip, cmd, params, callback) {
	var ops = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

	var pending = true;
	ops.repeat = ops.repeat || 1;

	var timeout = setTimeout(function () {
		pending = false;
		callback('Command timed out');
	}, TIMEOUT);

	var done = function done(err, result) {
		clearTimeout(timeout);
		if (pending) callback(err, result);
	};

	getHubInfo(ip, function (err, _ref) {
		var url = _ref.url,
		    remoteId = _ref.remoteId;

		if (err) return done(err);

		var socket = new _ws2.default(url);

		socket.on('open', function (err) {
			if (err) return done(err);
			var payload = {
				hubId: remoteId,
				timeout: Math.floor(TIMEOUT / 1000),
				hbus: { cmd: cmd, id: MSG_ID, params: params }
			};
			for (var i = 0; i <= ops.repeat; i++) {
				socket.send(JSON.stringify(payload));
			}
			if (ops.wait === false) {
				done();
				socket.close();
			}
		});

		socket.on('message', function (data) {
			var ob = JSON.parse(data);
			if (ob.id === MSG_ID) {
				done(null, ob);
				socket.close();
			}
		});
	});
};

var HarmonyHub = function () {
	function HarmonyHub(ip) {
		_classCallCheck(this, HarmonyHub);

		this.ip = ip;
	}

	_createClass(HarmonyHub, [{
		key: 'getActivities',
		value: function getActivities() {
			var _this = this;

			var digest = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

			return new Promise(function (resolve, reject) {
				var cmd = ENGINE + '?config';
				var params = { verb: 'get', format: 'json' };
				runCmd(_this.ip, cmd, params, function (err, ob) {
					if (err) return reject(err);
					var activities = _lodash2.default.get(ob, 'data.activity');
					if (!activities) return reject('Activities not found');
					if (!digest) return resolve(activities);
					var list = [];
					activities.forEach(function (activity) {
						var id = activity.id,
						    label = activity.label;

						list.push({ id: id, label: label });
					});
					resolve(list);
				});
			});
		}
	}, {
		key: 'runActivity',
		value: function runActivity(id) {
			var _this2 = this;

			id = _lodash2.default.trim(id);
			return new Promise(function (resolve, reject) {
				var cmd = 'harmony.activityengine?runactivity';
				var params = {
					async: 'false',
					timestamp: 0,
					args: { rule: 'start' },
					activityId: id
				};
				runCmd(_this2.ip, cmd, params, function (err, ob) {
					if (err) return reject();
					resolve();
				});
			});
		}
	}, {
		key: 'getCurrentActivity',
		value: function getCurrentActivity() {
			var _this3 = this;

			return new Promise(function (resolve, reject) {
				var cmd = ENGINE + '?getCurrentActivity';
				var params = { verb: 'get', format: 'json' };
				runCmd(_this3.ip, cmd, params, function (err, ob) {
					if (err) return reject(err);
					var activityId = _lodash2.default.get(ob, 'data.result');
					if (!activityId) return reject('Activity not found');
					resolve(activityId);
				});
			});
		}
	}, {
		key: 'onActivityStarted',
		value: function onActivityStarted(callback) {
			getHubInfo(this.ip, function (err, _ref2) {
				var url = _ref2.url;

				if (err) return;
				var lastActivityId = null;
				var socket = new _ws2.default(url);
				socket.on('message', function (data) {
					var ob = JSON.parse(data);
					var activityId = _lodash2.default.get(ob, 'data.activityId', false);
					if (ob.type === NOTIFY && activityId !== false && lastActivityId !== activityId) {
						lastActivityId = activityId;
						callback(activityId);
					}
				});
			});
		}

		// todo: cache socket and config information

	}, {
		key: 'pressButton',
		value: function pressButton(button) {
			var _this4 = this;

			var repeat = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

			button = _lodash2.default.trim(button);
			repeat = parseInt(repeat);
			if (repeat < 1) repeat = 1;
			return new Promise(function (resolve, reject) {
				if (repeat > 100) return reject('Repeat can\'t be above 100');
				_this4.getCurrentActivity().then(function (id) {
					if (id === '-1') return reject('No running activity');
					_this4.getActivities(false).then(function (list) {
						var activity = _lodash2.default.find(list, { id: id });
						if (!activity) return reject('Activity not found');
						var item = null;
						for (var i = 0; i < activity.controlGroup.length; i++) {
							var group = activity.controlGroup[i];
							item = _lodash2.default.find(group.function, { name: button });
							if (item) break;
						}
						if (!item) return reject('Button not found');
						var cmd = ENGINE + '?holdAction';
						var params = {
							timestamp: 0,
							verb: 'render',
							status: 'press',
							action: item.action
						};
						runCmd(_this4.ip, cmd, params, resolve, { wait: false, repeat: repeat });
					}).catch(function (err) {
						return reject(err);
					});
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}]);

	return HarmonyHub;
}();

exports.default = HarmonyHub;

module.exports = HarmonyHub;