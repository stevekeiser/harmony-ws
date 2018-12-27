'use strict';

var _ = require('.');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import HarmonyHub from '../dist/index.js';
// import HarmonyHub from 'harmony-ws';

var hub = new _2.default('192.168.1.20');

// hub.getActivities()
//     .then((list) => {
//         console.log(list);
//     })

// hub.getCurrentActivity()
//     .then((activity) => {
//         console.log(`Current activity is: ${activity.name}`);
//     });

// hub.runActivity('Chromecast')
//     .then(() => {
//         console.log('Started Chromecast');
//     });

// hub.pressButton('volume.down', 2000)
//     .then(() => {
//         console.log('Pressed button');
//     });

hub.onActivityStarted(function (activity) {
  console.log('Activity started: ' + activity.name);
});