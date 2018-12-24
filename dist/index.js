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
	var pending = true;

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
			socket.send(JSON.stringify(payload));
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

			return new Promise(function (resolve, reject) {
				var cmd = ENGINE + '?config';
				var params = { verb: 'get', format: 'json' };
				runCmd(_this.ip, cmd, params, function (err, ob) {
					if (err) return reject(err);
					var activities = _lodash2.default.get(ob, 'data.activity');
					if (!activities) return reject('Activities not found');
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
	}]);

	return HarmonyHub;
}();

exports.default = HarmonyHub;

module.exports = HarmonyHub;