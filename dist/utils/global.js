"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("./database"));
const globalUtils = {
    generateString(length) {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    },
    b64Decode(text) {
        return Buffer.from(text).toString('base64');
    },
    b64Encode(text) {
        return Buffer.from(text, 'base64').toString('utf-8');
    },
    generateToken(user_id, passwordHash) {
        //sorry ziad but im stealing this from hummus source, love you
        //oh also this: https://user-images.githubusercontent.com/34555296/120932740-4ca47480-c6f7-11eb-9270-6fb3fbbd856c.png
        const key = `${config_1.default.token_secret}.${passwordHash}`;
        const timeStampBuffer = Buffer.allocUnsafe(4);
        timeStampBuffer.writeUInt32BE(((Math.floor(Date.now() / 1000)) - 1293840));
        const encodedTimeStamp = timeStampBuffer.toString('base64');
        const encodedUserId = this.b64Encode(user_id);
        const partOne = `${encodedUserId}.${encodedTimeStamp}`;
        const encryptedAuth = crypto_1.default.createHmac('sha3-224', key).update(partOne).digest();
        const encodedEncryptedAuth = encryptedAuth.toString('base64');
        const partTwo = `${partOne}.${encodedEncryptedAuth}`;
        return partTwo;
    },
    checkToken(token) {
        return database_1.default.getAccountByToken(token) != null;
    }
};
exports.default = globalUtils;
