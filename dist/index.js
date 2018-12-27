'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _changeCase = require('change-case');

var _changeCase2 = _interopRequireDefault(_changeCase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// constants
var PORT = '8088';
var TIMEOUT = 10000;
var ENGINE = 'vnd.logitech.harmony/vnd.logitech.harmony.engine';
var EVENT_NOTIFY = 'connect.stateDigest?notify';

// private vars
var _ip = Symbol('ip');
var _msgId = Symbol('msgId');
var _hubId = Symbol('hubId');
var _socket = Symbol('socket');
var _queue = Symbol('queue');
var _config = Symbol('config');
var _callbacks = Symbol('callbacks');
var _timeouts = Symbol('timeouts');
var _started = Symbol('started');
var _lastActivityId = Symbol('lastActivityId');

// private methods
var _initSocket = Symbol('initSocket');
var _getConfig = Symbol('getConfig');
var _runCmd = Symbol('runCmd');
var _pressButton = Symbol('pressButton');
var _handleNotify = Symbol('handleNotify');

var HarmonyHub = function () {
	function HarmonyHub(ip) {
		_classCallCheck(this, HarmonyHub);

		this[_ip] = ip;
		this[_msgId] = 1000;
		this[_hubId] = null;
		this[_socket] = null;
		this[_started] = false;
		this[_lastActivityId] = null;
		this[_queue] = [];
		this[_config] = {};
		this[_timeouts] = {};
		this[_callbacks] = {};
	}

	_createClass(HarmonyHub, [{
		key: _initSocket,
		value: function value(callback) {
			var _this = this;

			if (this[_socket]) return callback();
			if (this[_started]) return this[_queue].push(callback);
			this[_started] = true;

			var config = {
				url: 'http://' + this[_ip] + ':' + PORT,
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
				var hubId = _lodash2.default.get(body, 'data.remoteId', false);
				var url = _lodash2.default.get(body, 'data.discoveryServerUri', '');
				if (!hubId) return callback('Hub not found');
				var domain = _url2.default.parse(url).hostname;
				var wsUrl = 'ws://' + _this[_ip] + ':' + PORT + '/?domain=' + domain + '&hubId=' + hubId;
				var socket = new _ws2.default(wsUrl);
				_this[_hubId] = hubId;

				socket.on('open', function (err) {
					if (err) return callback(err);
					_this[_socket] = socket;
					_this[_getConfig](function (err) {
						callback(err);
						_this[_queue].forEach(function (cb) {
							return cb(err);
						});
						_this[_queue].length = 0;
					});
				});

				socket.on('message', function (data) {
					try {
						var ob = JSON.parse(data);
						var id = ob.id,
						    type = ob.type;

						if (type === EVENT_NOTIFY) _this[_handleNotify](ob);
						if (_this[_callbacks][id]) {
							clearTimeout(_this[_timeouts][id]);
							_this[_callbacks][id](null, ob);
							_this[_callbacks][id] = null;
						}
					} catch (err) {}
				});

				socket.on('close', function () {
					// todo: ping socket and reconnect
					_this[_socket] = null;
					_this[_started] = false;
				});
			});
		}
	}, {
		key: _getConfig,
		value: function value(callback) {
			var _this2 = this;

			var cmd = ENGINE + '?config';
			var params = { verb: 'get', format: 'json' };
			this[_runCmd]({ cmd: cmd, params: params }, function (err, ob) {
				_this2[_config] = ob;
				callback(err);
			});
		}
	}, {
		key: _runCmd,
		value: function value(ops, callback) {
			var _this3 = this;

			this[_initSocket](function (err) {
				if (err) return callback(err);
				var cmd = ops.cmd,
				    params = ops.params,
				    wait = ops.wait;

				var id = _this3[_msgId]++;
				var payload = {
					hubId: _this3[_hubId],
					timeout: Math.floor(TIMEOUT / 1000),
					hbus: { cmd: cmd, id: id, params: params }
				};
				_this3[_socket].send(JSON.stringify(payload));
				if (wait === false) return callback();
				_this3[_callbacks][id] = callback;
				_this3[_timeouts][id] = setTimeout(function (id) {
					if (_this3[_callbacks][id]) {
						_this3[_callbacks][id]('Request timed out');
					}
				}, TIMEOUT);
			});
		}
	}, {
		key: _handleNotify,
		value: function value(ob) {
			var _this4 = this;

			if (!_lodash2.default.isFunction(this[_callbacks].onActivityStarted)) return;
			var id = _lodash2.default.get(ob, 'data.activityId', false);
			if (id === false || this[_lastActivityId] === id) return;
			this[_lastActivityId] = id;
			this.getActivities().then(function (activities) {
				var activity = _lodash2.default.find(activities, { id: id });
				if (activity) _this4[_callbacks].onActivityStarted(activity);
			}).catch(function () {});
		}
	}, {
		key: _pressButton,
		value: function value(button, duration, callback) {
			var _this5 = this;

			var cmd = ENGINE + '?holdAction';
			var interval = 200;
			var run = function run(status, cb) {
				var params = {
					timestamp: 0,
					verb: 'render',
					status: status,
					action: button.action
				};
				_this5[_runCmd]({ cmd: cmd, params: params, wait: false }, function (err) {
					if (err) return cb(err);
					setTimeout(cb, interval);
				});
			};
			var list = ['press'];
			var times = Math.floor(duration / interval);
			for (var i = 0; i <= times; i++) {
				list.push('hold');
			}list.push('release');
			_async2.default.eachSeries(list, run, callback);
		}
	}, {
		key: 'getActivities',
		value: function getActivities() {
			var _this6 = this;

			return new Promise(function (resolve, reject) {
				_this6[_initSocket](function (err) {
					if (err) return reject(err);
					var activities = _lodash2.default.get(_this6[_config], 'data.activity');
					if (!activities) return reject('Activities not found');
					var list = [];
					activities.forEach(function (activity) {
						var id = activity.id,
						    name = activity.label;

						list.push({ id: id, name: name });
					});
					resolve(list);
				});
			});
		}
	}, {
		key: 'runActivity',
		value: function runActivity(id) {
			var _this7 = this;

			id = _lodash2.default.trim(id);
			return new Promise(function (resolve, reject) {
				_this7.getActivities().then(function (activities) {
					var activity = _lodash2.default.find(activities, { name: id });
					if (!activity) activity = _lodash2.default.find(activities, { id: id });
					if (!activity) return reject('Activity not found');
					var cmd = 'harmony.activityengine?runactivity';
					var params = {
						async: 'false',
						timestamp: 0,
						args: { rule: 'start' },
						activityId: activity.id
					};
					_this7[_runCmd]({ cmd: cmd, params: params }, function (err) {
						if (err) return reject(err);
						resolve();
					});
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: 'getCurrentActivity',
		value: function getCurrentActivity() {
			var _this8 = this;

			return new Promise(function (resolve, reject) {
				var cmd = ENGINE + '?getCurrentActivity';
				var params = { verb: 'get', format: 'json' };
				_this8[_runCmd]({ cmd: cmd, params: params }, function (err, ob) {
					if (err) return reject(err);
					var id = _lodash2.default.get(ob, 'data.result');
					if (!id) return reject('Activity not found');
					_this8.getActivities().then(function (activities) {
						var activity = _lodash2.default.find(activities, { id: id });
						if (!activity) return reject('Activity not found');
						resolve(activity);
					}).catch(function (err) {
						return reject(err);
					});
				});
			});
		}
	}, {
		key: 'onActivityStarted',
		value: function onActivityStarted(callback) {
			var _this9 = this;

			this[_initSocket](function () {
				_this9[_callbacks].onActivityStarted = callback;
			});
		}
	}, {
		key: 'pressButton',
		value: function pressButton(name) {
			var _this10 = this;

			var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

			name = _lodash2.default.trim(name);
			var nameTitle = _changeCase2.default.title(name);
			var nameNoSpaces = nameTitle.replace(/\s/g, '');
			return new Promise(function (resolve, reject) {
				_this10.getCurrentActivity().then(function (_ref) {
					var id = _ref.id;

					if (id === '-1') return reject('No activity currently running');
					var activities = _lodash2.default.get(_this10[_config], 'data.activity');
					if (!activities) return reject('Activities not found');
					var activity = _lodash2.default.find(activities, { id: id });
					if (!activity || !activity.controlGroup) return reject('Activity not found');
					var button = null;
					for (var i = 0; i < activity.controlGroup.length; i++) {
						var group = activity.controlGroup[i];
						button = _lodash2.default.find(group.function, { name: nameNoSpaces });
						if (!button) button = _lodash2.default.find(group.function, { label: nameTitle });
						if (button) break;
					}
					if (!button) return reject('Button "' + name + '" not found');
					_this10[_pressButton](button, duration, function (err) {
						if (err) return reject(err);
						resolve();
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