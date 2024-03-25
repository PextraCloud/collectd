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
import {SocketType} from 'dgram';

// https://github.com/collectd/collectd/wiki/Plugin-Network
export const COLLECTD_DEFAULTS = {
	PORT: 25826,
	PROTOCOL: 'udp4' as SocketType,
	IPv4_GROUP: '239.192.74.66',
	IPv6_GROUP: 'ff18::efc0:4a42',
};

export interface CollectdClientOptions {
	/** IP address to bind to. */
	address?: string;

	/** Port to bind to. */
	port?: number;

	/** Protocol to use. */
	protocol?: SocketType;
}

export type CollectdValuePacket = {
	time: number;
	interval?: number;
	host: string;
	plugin: string;
	plugin_instance: string;
	type: string;
	type_instance: string;
	data: Array<Array<any>>;
};

export type CollectdNotificationPacket = {
	time: number;
	severity: number;
	host: string;
	message: string;
};
