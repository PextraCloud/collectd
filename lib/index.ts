/*
 Copyright 2024 Pextra Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import {ParseCollectdPacket} from './parse';
import {
	COLLECTD_DEFAULTS,
	CollectdClientOptions,
	CollectdNotificationPacket,
	CollectdValuePacket,
} from './types';

import {EventEmitter} from 'events';
import {Socket, createSocket} from 'dgram';

/**
 * Client that connects to a collectd server over UDP.
 */
export default class CollectdClient extends EventEmitter {
	options: CollectdClientOptions;
	client?: Socket;

	constructor(options?: CollectdClientOptions) {
		super();
		this.options = options || {};
	}

	start() {
		this.client = createSocket(
			this.options.protocol || COLLECTD_DEFAULTS.PROTOCOL
		);

		const port = this.options.port || COLLECTD_DEFAULTS.PORT;
		const address = this.options.address || COLLECTD_DEFAULTS.IPv4_GROUP;

		this.client.bind(port, () => this.client?.addMembership(address));
		this.client.on('message', msg => {
			try {
				const results = ParseCollectdPacket(Buffer.from(msg));
				this.emit('data', results);
			} catch (err) {
				this.emit('error', err);
			}
		});

		return this;
	}

	close() {
		if (this.client) {
			this.client.close();
		} else {
			throw new Error('collectd: client has not been started');
		}

		this.emit('close');
		return this;
	}

	on(
		event: 'data',
		listener: (data: {
			values: Array<CollectdValuePacket>;
			notifications: Array<CollectdNotificationPacket>;
		}) => void
	): this;
	on(event: 'error', listener: (err: Error) => void): this;
	on(event: 'close', listener: () => void): this;

	on(event: string, listener: (...args: Array<any>) => void): this {
		return super.on(event, listener);
	}
}
