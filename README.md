# harmony-ws

Websocket-based interface for the Harmony Hub. Works with the latest firmware that killed support for XMPP.

```javascript
import HarmonyHub from 'harmony-ws';

const hub = new HarmonyHub('192.168.1.20');

hub.getActivities()
    .then((activities) => {
        console.log(activities);
        // [
        //    { id: '-1', name: 'off' },
        //    { id: '21642159', name: 'chromecast' },
        //    { id: '26240332', name: 'tv' },
        //    { id: '26240296', name: 'roku' },
        //    { id: '21641746', name: 'blu_ray' }
        // ]
    })

hub.getCurrentActivity()
    .then((activity) => {
        console.log(`Current activity is: ${activity.name}`);
    });

// start an activity by id or name (case insensitive)
hub.startActivity('chromecast')
    .then(() => {
        console.log('Starting Chromecast');
    });

// press a button (relative to the current activity)
hub.pressButton('volume down', 2000)
    .then(() => {
        console.log('Pressed volume down for 2 seconds');
    });

// listen for changes to the current activity
hub.onActivityStarted((activity) => {
    console.log(`Activity started: ${activity.name}`);
});

// refresh internal cache
hub.refresh()
    .then((activity) => {
        console.log('Updated activity listing');
    });
```
