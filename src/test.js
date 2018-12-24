import HarmonyHub from '.';
// import HarmonyHub from '../dist/index.js';

const hub = new HarmonyHub('192.168.1.20');

hub.getActivities()
    .then((list) => {
        console.log('Activities:', list);
    })