// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as cluster from "cluster";

// https://github.com/discordjs/discord.js/blob/master/src/util/Snowflake.js
// Apache License Version 2.0 Copyright 2015 - 2021 Amish Shah
// Stolen from fosscord, thanks
export default class Snowflake {
	static readonly EPOCH = 1420070400000;
	static INCREMENT = 0n; // max 4095
	static processId = BigInt(process.pid % 31); // max 31
	static workerId = BigInt((cluster.worker?.id || 0) % 31); // max 31

	constructor() {
		throw new Error(
			`The ${this.constructor.name} class may not be instantiated.`,
		);
	}

	static idToBinary(num) {
		let bin = "";
		let high = parseInt(num.slice(0, -10)) || 0;
		let low = parseInt(num.slice(-10));
		while (low > 0 || high > 0) {
			bin = String(low & 1) + bin;
			low = Math.floor(low / 2);
			if (high > 0) {
				low += 5000000000 * (high % 2);
				high = Math.floor(high / 2);
			}
		}
		return bin;
	}

	static binaryToID(num) {
		let dec = "";

		while (num.length > 50) {
			const high = parseInt(num.slice(0, -32), 2);
			const low = parseInt((high % 10).toString(2) + num.slice(-32), 2);

			dec = (low % 10).toString() + dec;
			num =
				Math.floor(high / 10).toString(2) +
				Math.floor(low / 10)
					.toString(2)
					.padStart(32, "0");
		}

		num = parseInt(num, 2);
		while (num > 0) {
			dec = (num % 10).toString() + dec;
			num = Math.floor(num / 10);
		}

		return dec;
	}

	static generateWorkerProcess() {
		const time = BigInt(Date.now() - Snowflake.EPOCH) << BigInt(22);
		const worker = Snowflake.workerId << 17n;
		const process = Snowflake.processId << 12n;
		const increment = Snowflake.INCREMENT++;
		return BigInt(time | worker | process | increment);
	}

	static generate() {
		return Snowflake.generateWorkerProcess().toString();
	}
	
	static deconstruct(snowflake) {
		const BINARY = Snowflake.idToBinary(snowflake)
			.toString(2)
			.padStart(64, "0");
		const res = {
			timestamp: parseInt(BINARY.substring(0, 42), 2) + Snowflake.EPOCH,
			workerID: parseInt(BINARY.substring(42, 47), 2),
			processID: parseInt(BINARY.substring(47, 52), 2),
			increment: parseInt(BINARY.substring(52, 64), 2),
			binary: BINARY,
		};
		Object.defineProperty(res, "date", {
			get: function get() {
				return new Date(this.timestamp);
			},
			enumerable: true,
		});
		return res;
	}
}