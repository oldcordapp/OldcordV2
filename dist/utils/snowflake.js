"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = __importDefault(require("cluster"));
const SnowflakeUtil = {
    workerId: BigInt((((_a = cluster_1.default.worker) === null || _a === void 0 ? void 0 : _a.id) || 0) % 31),
    processId: BigInt(process.pid % 31),
    INCREMENT: BigInt(0),
    EPOCH: BigInt(1420070400000),
    idToBinary(num) {
        let bin = '';
        let high = BigInt(parseInt(num.slice(0, -10)) || 0);
        let low = BigInt(parseInt(num.slice(-10)));
        while (low > 0 || high > 0) {
            bin = String(low & BigInt(1)) + bin;
            low = BigInt(Math.floor(Number(low) / 2));
            if (high > BigInt(0)) {
                low += BigInt(5000000000) * (high % BigInt(2));
                high = BigInt(Math.floor(Number(high) / 2));
            }
        }
        return bin;
    },
    binaryToID(num) {
        let dec = '';
        while (num.length > 50) {
            const high = BigInt(parseInt(num.slice(0, -32), 2));
            const low = BigInt(parseInt((high % BigInt(10)).toString(2) + num.slice(-32), 2));
            dec = (low % BigInt(10)).toString() + dec;
            num = (BigInt(Math.floor(Number(high) / 10)).toString(2)) + (BigInt(Math.floor(Number(low) / 10)).toString(2)).padStart(32, '0');
        }
        num = BigInt(parseInt(num, 2)).toString();
        while (num.length > 0) {
            dec = (parseInt(num) % 10).toString() + dec;
            num = BigInt(Math.floor(parseInt(num) / 10)).toString();
        }
        return dec;
    },
    generateWorkerProcess() {
        let time = BigInt(Date.now()) - this.EPOCH;
        time <<= BigInt(22);
        let worker = (this.workerId << BigInt(17));
        let process = (this.processId << BigInt(12));
        let increment = this.INCREMENT++;
        return BigInt(time | worker | process | increment);
    },
    generate() {
        return this.generateWorkerProcess().toString();
    },
    deconstruct(snowflake) {
        const BINARY = this.idToBinary(snowflake).toString().padStart(64, '0');
        const res = {
            timestamp: parseInt(BINARY.substring(0, 42), 2) + Number(this.EPOCH),
            workerID: parseInt(BINARY.substring(42, 47), 2),
            processID: parseInt(BINARY.substring(47, 52), 2),
            increment: parseInt(BINARY.substring(52, 64), 2),
            binary: BINARY,
            get date() {
                return new Date(this.timestamp);
            },
        };
        return res;
    },
};
exports.default = SnowflakeUtil;
