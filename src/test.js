import HarmonyHub from '.';
// import HarmonyHub from '../dist/index.js';
// import HarmonyHub from 'harmony-ws';
 
const hub = new HarmonyHub('192.168.1.20');
 
// hub.getActivities()
//     .then((activities) => {
//         console.log(activities);
//     })
 
// hub.getCurrentActivity()
//     .then((activity) => {
//         console.log(`Current activity is: ${activity.label}`);
//     });
 
// hub.startActivity('chromecast')
//     .then((activity) => {
//         console.log(`Started activity: ${activity.label}`);
//     });
 
// hub.pressButton('volume down', 2000)
//     .then((button) => {
//         console.log(`Pressed ${button.label} for 2 seconds`);
//     });
 
// hub.onActivityStarted((activity) => {
//     console.log(`Activity started: ${activity.label}`);
// });