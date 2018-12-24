'use strict';

var _index = require('../dist/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var hub = new _index2.default('192.168.1.20');

hub.getCurrentActivity().then(function (id) {
    console.log('Current activity is: ' + id);
});