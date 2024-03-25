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
import {CollectdNotificationPacket, CollectdValuePacket} from './types';

// https://github.com/collectd/collectd/wiki/Binary-protocol
const ctype = require('ctype');

const TYPES = {
	MESSAGE_KINDS: {
		HOST: 0x0000,
		TIME: 0x0001,
		PLUGIN: 0x0002,
		PLUGIN_INSTANCE: 0x0003,
		TYPE: 0x0004,
		TYPE_INSTANCE: 0x0005,
		VALUES: 0x0006,
		INTERVAL: 0x0007,
		TIME_HIRES: 0x0008,
		INTERVAL_HIRES: 0x0009,
	},
	NOTIFICATIONS: {
		MESSAGE: 0x0100,
		SEVERITY: 0x0101,
	},
	DS_KINDS: {
		COUNTER: 0,
		GAUGE: 1,
		DERIVE: 2,
		ABSOLUTE: 3,
	},
};

const headerPacket = [{type: {type: 'uint16_t'}}, {length: {type: 'uint16_t'}}];
const ctypeParser = new ctype.Parser({endian: 'big'});

const toAbs64 = (val: Array<number>) => {
	if (!Array.isArray(val) || val.length !== 2 || val[0] >= 0x100000) {
		throw new Error('Invalid value for conversion');
	}
	return val[0] * Math.pow(2, 32) + val[1];
};

const toApprox64 = (val: Array<number>) => {
	if (!Array.isArray(val) || val.length !== 2) {
		throw new Error('Invalid value for conversion');
	}
	return Math.pow(2, 32) * val[0] + val[1];
};

const to64 = (val: Array<number>) => {
	try {
		return toAbs64(val);
	} catch (e) {
		return toApprox64(val);
	}
};

const decode_network_string = (msgtype: number, len: number, buf: Buffer) => {
	const nstring = ctypeParser.readData(
		[{content: {type: 'char[' + len + ']'}}],
		buf,
		4
	);
	return nstring.content.toString('ascii', 0, Number(len) - 1);
};

const decode_network_number = (msgtype: number, len: number, buf: Buffer) => {
	const nnumber = ctype.rsint64(buf, 'big', 4);
	return to64(nnumber);
};

const decode_network_values = (msgtype: number, len: number, buf: Buffer) => {
	const value_count = ctype.ruint16(buf, 'big', 4);
	const values: Array<any> = [];
	const value_types = [];
	const offset = 6;
	const data_offset = offset + value_count;
	for (let i = 0; i < value_count; i++) {
		value_types.push(ctype.ruint8(buf, 'big', offset + i));
	}
	value_types.forEach((type, index) => {
		let value = null;
		switch (type) {
			case TYPES.DS_KINDS.COUNTER:
			case TYPES.DS_KINDS.ABSOLUTE:
				value = to64(
					ctype.ruint64(buf, 'big', data_offset + 8 * index)
				);
				break;
			case TYPES.DS_KINDS.GAUGE:
				value = ctype.rdouble(buf, 'little', data_offset + 8 * index);
				break;
			case TYPES.DS_KINDS.DERIVE:
				value = to64(
					ctype.rsint64(buf, 'big', data_offset + 8 * index)
				);
				break;
			default:
				throw new Error(`Sorry, can't handle variable type ${type}`);
		}
		values.push([type, value]);
	});
	return values;
};

const decoders = {
	[TYPES.MESSAGE_KINDS.HOST]: decode_network_string,
	[TYPES.MESSAGE_KINDS.PLUGIN]: decode_network_string,
	[TYPES.MESSAGE_KINDS.PLUGIN_INSTANCE]: decode_network_string,
	[TYPES.MESSAGE_KINDS.TYPE]: decode_network_string,
	[TYPES.MESSAGE_KINDS.TYPE_INSTANCE]: decode_network_string,
	[TYPES.NOTIFICATIONS.MESSAGE]: decode_network_string,
	[TYPES.MESSAGE_KINDS.TIME]: decode_network_number,
	[TYPES.MESSAGE_KINDS.INTERVAL]: decode_network_number,
	[TYPES.NOTIFICATIONS.SEVERITY]: decode_network_number,
	[TYPES.MESSAGE_KINDS.TIME_HIRES]: decode_network_number,
	[TYPES.MESSAGE_KINDS.VALUES]: decode_network_values,
	[TYPES.MESSAGE_KINDS.INTERVAL_HIRES]: decode_network_number,
};

const interpret_results = (results: Array<Array<any>>) => {
	const packets: {
		values: Array<CollectdValuePacket>;
		notifications: Array<CollectdNotificationPacket>;
	} = {
		values: [],
		notifications: [],
	};

	const valuePacket: Partial<CollectdValuePacket> = {};
	const notificationPacket: Partial<CollectdNotificationPacket> = {};
	results.forEach(([type, value]) => {
		switch (type) {
			case TYPES.MESSAGE_KINDS.TIME:
				valuePacket.time = value;
				break;
			case TYPES.MESSAGE_KINDS.TIME_HIRES:
				valuePacket.time = value;
				break;

			case TYPES.MESSAGE_KINDS.INTERVAL:
				valuePacket.interval = value;
				break;
			case TYPES.MESSAGE_KINDS.INTERVAL_HIRES:
				valuePacket.interval = value;
				break;

			case TYPES.MESSAGE_KINDS.HOST:
				valuePacket.host = value;
				break;

			case TYPES.MESSAGE_KINDS.PLUGIN:
				valuePacket.plugin = value;
				break;
			case TYPES.MESSAGE_KINDS.PLUGIN_INSTANCE:
				valuePacket.plugin_instance = value;
				break;

			case TYPES.MESSAGE_KINDS.TYPE:
				valuePacket.type = value;
				break;
			case TYPES.MESSAGE_KINDS.TYPE_INSTANCE:
				valuePacket.type_instance = value;
				break;

			case TYPES.NOTIFICATIONS.SEVERITY:
				notificationPacket.severity = value;
				break;

			case TYPES.NOTIFICATIONS.MESSAGE:
				notificationPacket.message = value;
				packets.notifications.push(
					notificationPacket as CollectdNotificationPacket
				);
				break;
			case TYPES.MESSAGE_KINDS.VALUES:
				valuePacket.data = value;
				packets.values.push(valuePacket as CollectdValuePacket);
				break;
		}
	});

	return packets;
};

export const ParseCollectdPacket = (buf: Buffer) => {
	const results = [];
	let offset = 0;
	const blength = buf.length;
	while (offset < blength) {
		const header = ctypeParser.readData(headerPacket, buf, offset);
		const decoder = decoders[header.type];
		if (decoder) {
			const value = decoder(
				header.type,
				header.length - 4,
				buf.subarray(offset, offset + header.length)
			);
			results.push([header.type, value]);
		} else {
			console.error(`No handler for type ${header.type}`);
		}
		offset += header.length;
	}
	return interpret_results(results);
};
