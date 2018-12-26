# harmony-ws

Websocket-based interface for the Harmony Hub. Works with the latest firmware that killed support for XMPP.

```javascript
import HarmonyHub from 'harmony-ws';

const hub = new HarmonyHub('192.168.1.20');

hub.getActivities()
    .then((list) => {
        console.log(list);
        // [
        //    { id: '-1', label: 'PowerOff' },
        //    { id: '21642159', label: 'Chromecast' },
        //    { id: '26240332', label: 'TV' },
        //    { id: '26240296', label: 'Roku' },
        //    { id: '21641746', label: 'Blu-ray' }
        // ]
    })

hub.getCurrentActivity()
    .then((id) => {
        console.log(`Current activity is: ${id}`);
    });

hub.runActivity('21642159')
    .then(() => {
        console.log('Started Chromecast');
    });

// press a button relative to the current activity
hub.pressButton('VolumeDown', 5)
    .then(() => {
        console.log('Lowered the volume by 5 steps');
    });

// listen for changes to the current activity
hub.onActivityStarted((id) => {
    console.log(`Activity started: ${id}`);
});
```
