# harmony-ws

```javascript
import HarmonyHub from 'harmony-ws';

const hub = new HarmonyHub('192.168.1.20');

hub.getActivities()
    .then((list) => {
        console.log('Activities:', list);
    })

hub.runActivity(-1)
    .then(() => {
        console.log(`Turned off`);
    })
```
