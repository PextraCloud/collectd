# collectd

>A library for collecting metrics from the collectd daemon written in TypeScript.

<br>

[![Downloads](https://badgen.net/npm/dt/@pextra/collectd)](https://www.npmjs.com/package/@pextra/collectd)
[![npm dependents](https://badgen.net/npm/dependents/@pextra/collectd)](https://www.npmjs.com/package/@pextra/collectd?activeTab=dependents)
[![Version](https://badgen.net/npm/v/@pextra/collectd)](https://www.npmjs.com/package/@pextra/collectd)
[![License](https://badgen.net/npm/license/@pextra/collectd)](https://opensource.org/license/apache-2-0)

## NOTICE

**This package is still in development and *is not* yet ready for production use. There *will* be breaking changes before the package is stable.**

Most commands are implemented, but a few are not yet. Not many of the command options are implemented yet, but the most common ones are.

**Please open an issue if you would like a specific option implemented.**

## Install

```sh
npm install @pextra/collectd
```

Currently, Bun is not supported due to the [lack of support for the `dgram` module](https://github.com/oven-sh/bun/issues/1630).

## Usage

### CollectdClient

Create a new instance of the `CollectdClient` class. The constructor takes an optional `options` object with the following properties:
```typescript
address: string; // The address of the collectd server. Default: '239.192.74.66' (ipv4 multicast) or 'ff18::efc0:4a42' (ipv6 multicast).
port: number; // The port of the collectd server. Default: 25826.
protocol: SocketType; // The protocol to use. Default: 'udp4'.
```

The `CollectdClient` class has the following methods:
```typescript
start(); // Start listening for collectd packets.
close(); // Stop listening for collectd packets.
```

The `CollectdClient` class is an [EventEmitter](https://nodejs.org/api/events.html#class-eventemitter) emits the following events:
```typescript
'data': (data: {values: Array<CollectdValuePacket>, notifications: Array<CollectdNotificationPacket>}) => void; // Emitted when a collectd packet is received.
'error': (error: Error) => void; // Emitted when an error occurs.
'close': () => void; // Emitted when the client is closed.
```

See [lib/types/index.ts](./lib/types/index.ts) for all the types used in the library.

### Setting up collectd

`@pextra/collectd` depends on the `network` plugin being enabled in collectd. To enable the `network` plugin, add the following to your collectd configuration file:
```sh
LoadPlugin network

<Plugin network>
        Server "<address>" "<port>"
</Plugin>
```

The library would then be able to receive collectd packets from the collectd server:
```typescript
import {CollectdClient} from '@pextra/collectd';

const client = new CollectdClient({
	address: '<address>',
	port: '<port>',
});

client.on('data', (data) => {
	console.log(data);
});

client.start();
```

## Support/Contact

For enterprise licensing, support, and consulting, please visit [our website](https://pextra.cloud/enterprise). Alternatively, you can contact us at [enterprise@pextra.cloud](mailto:support@pextra.cloud).

If you have any questions, please feel free open an issue or a discussion. You can also contact us at [support@pextra.cloud](mailto:support@pextra.cloud).

## Contributions

We welcome contributions! If you find any bugs, have feature requests, or would like to contribute enhancements, please feel free to open issues or submit pull requests.

We use [gts](https://github.com/google/gts) for linting and formatting.

## License

collectd is licensed under the [Apache 2.0 License](./LICENSE).
