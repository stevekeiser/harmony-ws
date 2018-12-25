import HarmonyHub from '.';
// import HarmonyHub from '../dist/index.js';

const hub = new HarmonyHub('192.168.1.92');

hub.onActivityStarted((activityId) => {
    console.log(`Activity started: ${activityId}`);
})

hub.getActivities()
    .then((list) => {
        console.log(list);
    })

setTimeout(() => {}, 60000)