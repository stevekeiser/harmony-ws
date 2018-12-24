import HarmonyHub from '.';
// import HarmonyHub from '../dist/index.js';

const hub = new HarmonyHub('192.168.1.20');

hub.getCurrentActivity()
    .then((id) => {
        console.log(`Current activity is: ${id}`);
    })

// hub.runActivity(-1)
//     .then(() => {
//         console.log(`Turned off`);
//     })