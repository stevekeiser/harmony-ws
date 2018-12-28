import HarmonyHub from '.';
// import HarmonyHub from '../dist/index.js';
// import HarmonyHub from 'harmony-ws';
 
const hub = new HarmonyHub('192.168.1.20');
 
hub.getActivities()
    .then((list) => {
        console.log(list);
    })
 
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
 
// hub.onActivityStarted((activity) => {
//     console.log(`Activity started: ${activity.name}`);
// });