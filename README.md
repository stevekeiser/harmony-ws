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
        // [ { id: '-1', name: 'off', label: 'PowerOff' },
        // { id: '21642159', name: 'chromecast', label: 'Chromecast' },
        // { id: '26240332', name: 'tv', label: 'TV' },
        // { id: '26240296', name: 'roku', label: 'Roku' },
        // { id: '21641746', name: 'blu_ray', label: 'Blu-ray' } ]
    })

hub.getCurrentActivity()
    .then((activity) => {
        console.log(`Current activity is: ${activity.label}`);
    });

// start an activity by id, name, or label
hub.startActivity('chromecast')
    .then((activity) => {
        console.log(`Started activity: ${activity.label}`);
    });

// listen for changes to the current activity
hub.onActivityStarted((activity) => {
    console.log(`Activity started: ${activity.label}`);
});

// press a button (on the current activity or a specific device)
// optional second param is how long to hold the button (in milliseconds)
// optional second/third param is which device to use
hub.pressButton('volume down', 2000, 'samsung tv')
    .then((button) => {
        console.log(`Pressed button: ${button.label}`);
    });

// alias for startActivity('off')
hub.turnOff();

// refresh the internal cache
hub.refresh()
    .then((activities) => {
        console.log('Updated activity list', activities);
    });
```
