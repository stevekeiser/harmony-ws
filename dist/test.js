'use strict';

var _ = require('.');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import HarmonyHub from '../dist/index.js';

var hub = new _2.default('192.168.1.92');

hub.onActivityStarted(function (activityId) {
    console.log('Activity started: ' + activityId);
});

hub.getActivities().then(function (list) {
    console.log(list);
});

setTimeout(function () {}, 60000);