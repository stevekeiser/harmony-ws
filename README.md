# harmony-ws

### Control a Logitech Harmony Hub via the local network

Under the hood, this is a WebSocket implementation that works without XMPP. It is compatible with hub firmware 4.15.206 (released late December 2018) that broke errbody.
<br>
<br>

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
        console.log('Started Chromecast activity');
    });

// listen for changes to the current activity
hub.onActivityStarted((activity) => {
    console.log(`Activity started: ${activity.name}`);
});

// press a button (relative to the current activity)
hub.pressButton('volume down', 2000)
    .then(() => {
        console.log('Pressed volume down for 2 seconds');
    });

// refresh internal cache
hub.refresh()
    .then(() => {
        console.log('Updated activity listing');
    });
```
