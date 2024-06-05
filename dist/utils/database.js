"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const logger_1 = require("./logger");
const global_1 = __importDefault(require("./global"));
const bcrypt_1 = require("bcrypt");
const snowflake_1 = __importDefault(require("./snowflake"));
const configuration = {
    host: 'localhost',
    port: 5432,
    database: 'oldcord_2015',
    user: 'postgres',
    password: 'oldcord_test'
};
const pool = new pg_1.Pool(configuration);
const database = {
    client: null,
    setupDatabase: () => __awaiter(void 0, void 0, void 0, function* () {
        database.client = yield pool.connect();
        try {
            const initializeQuery = {
                name: 'initialize-db',
                text: `
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT,
                discriminator INTEGER,
                email TEXT,
                password TEXT,
                token TEXT,
                verified BOOLEAN DEFAULT FALSE,
                created_at TEXT DEFAULT NULL,
                avatar TEXT,
                settings TEXT DEFAULT "INLINE_EMBED_MEDIA:1,INLINE_ATTACHMENT_MEDIA:1,RENDER_EMBEDS:1,ENABLE_TTS_COMMAND:1,THEME:DARK"
            );
            CREATE TABLE IF NOT EXISTS users_presences (
                user_id TEXT PRIMARY KEY,
                game TEXT DEFAULT NULL,
                status TEXT DEFAULT 'offline'
            );
            CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                type INTEGER DEFAULT 0,
                guild_id TEXT,
                topic TEXT DEFAULT NULL,
                last_message_id TEXT DEFAULT '0',
                recipient_id TEXT DEFAULT NULL,
                is_private BOOLEAN DEFAULT FALSE,
                permission_overwrites TEXT,
                name TEXT,
                position INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS channels_permissions (
                channel_id TEXT,
                overwrite TEXT DEFAULT NULL
            );
            CREATE TABLE IF NOT EXISTS guilds (
                id TEXT PRIMARY KEY,
                name TEXT,
                icon TEXT DEFAULT NULL,
                region TEXT DEFAULT NULL,
                owner_id TEXT,
                afk_channel_id TEXT,
                afk_timeout INTEGER DEFAULT 300,
                creation_date TEXT
            );
            CREATE TABLE IF NOT EXISTS guilds_roles (
                guild_id TEXT,
                role_id TEXT,
                name TEXT,
                permissions INTEGER DEFAULT 104193089,
                position INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS guilds_members (
                guild_id TEXT,
                user_id TEXT,
                roles TEXT DEFAULT NULL,
                joined_at TEXT DEFAULT NULL,
                deaf BOOLEAN DEFAULT FALSE,
                mute BOOLEAN DEFAULT FALSE
            );
            CREATE TABLE IF NOT EXISTS guilds_invites (
                guild_id TEXT,
                channel_id TEXT,
                code TEXT,
                temporary BOOLEAN DEFAULT FALSE,
                revoked BOOLEAN DEFAULT FALSE,
                inviter_id TEXT,
                uses INTEGER DEFAULT 0,
                maxUses INTEGER DEFAULT 0,
                maxAge INTEGER DEFAULT 0,
                xkcdpass BOOLEAN DEFAULT FALSE,
                createdAt TEXT
            );
            CREATE TABLE IF NOT EXISTS guilds_messages_attachments (
                attachment_id TEXT,
                message_id TEXT,
                filename TEXT,
                height INTEGER,
                width INTEGER,
                size INTEGER,
                url TEXT
            );
            CREATE TABLE IF NOT EXISTS guilds_messages (
                guild_id TEXT,
                message_id TEXT,
                channel_id TEXT,
                author_id TEXT,
                content TEXT,
                edited_timestamp TEXT DEFAULT NULL,
                mention_everyone BOOLEAN DEFAULT FALSE,
                nonce TEXT,
                timestamp TEXT,
                tts BOOLEAN DEFAULT FALSE
            );
            CREATE TABLE IF NOT EXISTS guilds_widgets (
                guild_id TEXT,
                channel_id TEXT DEFAULT NULL,
                enabled BOOLEAN DEFAULT FALSE
            );
            CREATE TABLE IF NOT EXISTS guilds_bans (
                guild_id TEXT,
                user_id TEXT
            );`,
                values: []
            };
            const result = yield database.client.query(initializeQuery);
            if (result.rowCount > 0) {
                return true;
            }
            return false;
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return false;
        }
    }),
    getAccountByEmail: (email) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const query = {
                name: 'fetch-users-by-email',
                text: `
                    SELECT * FROM users WHERE email = $1
                `,
                values: [email]
            };
            const result = yield database.client.query(query);
            return result.rowCount > 0 ? result.rows[0] : null;
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return null;
        }
    }),
    getAccountByToken: (token) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const query = {
                name: 'fetch-users-by-token',
                text: `
                    SELECT * FROM users WHERE token = $1
                `,
                values: [token]
            };
            const result = yield database.client.query(query);
            return result.rowCount > 0 ? result.rows[0] : null;
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return null;
        }
    }),
    getAccountsByUsername: (username) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const query = {
                name: 'fetch-users-by-token',
                text: `
                    SELECT * FROM users WHERE username = $1
                `,
                values: [username]
            };
            const result = yield database.client.query(query);
            return result.rows;
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return [];
        }
    }),
    getAccountByUserId: (id) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const query = {
                name: 'fetch-user-by-userid',
                text: `
                    SELECT * FROM users WHERE id = $1
                `,
                values: [id]
            };
            const result = yield database.client.query(query);
            if (result.rowCount > 0) {
                return result.rows[0];
            }
            else {
                return null;
            }
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return null;
        }
    }),
    getGuildById: (id) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const query = {
                name: 'fetch-guild-by-guildid',
                text: `
                    SELECT * FROM guilds WHERE id = $1
                `,
                values: [id]
            };
            const result = yield database.client.query(query);
            if (result.rowCount > 0) {
                return result.rows[0];
            }
            else {
                return null;
            }
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return null;
        }
    }),
    createAccount: (username, email, password) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let user = yield database.getAccountByEmail(email);
            if (user != null) {
                return {
                    success: false,
                    reason: "Email is already registered."
                };
            }
            let users = yield database.getAccountsByUsername(username);
            if (users.length == 9999) {
                return {
                    success: false,
                    reason: "Too many people have this username."
                };
            }
            let salt = yield (0, bcrypt_1.genSalt)(10);
            let pwHash = yield (0, bcrypt_1.hash)(password, salt);
            let id = snowflake_1.default.generate();
            let date = new Date().toISOString();
            let discriminator = Math.round(Math.random() * 9999);
            while (discriminator < 1000) {
                discriminator = Math.round(Math.random() * 9999);
            }
            let token = global_1.default.generateToken(id, pwHash);
            const insertUserQuery = {
                name: 'create-account',
                text: `
                    INSERT INTO users (id,username,discriminator,email,password,token,created_at,avatar,settings) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8)
                `,
                values: [id, username, discriminator, email, pwHash, token, date, "INLINE_EMBED_MEDIA:1,INLINE_ATTACHMENT_MEDIA:1,RENDER_EMBEDS:1,ENABLE_TTS_COMMAND:1,THEME:DARK"]
            };
            const insertPresenceQuery = {
                name: 'create-user-presence',
                text: `
                    INSERT INTO users_presences (user_id, game, status) VALUES ($1, "NULL", "offline")
                `,
                values: [id]
            };
            const insertUserResult = yield database.client.query(insertUserQuery);
            const insertPresenceResult = yield database.client.query(insertPresenceQuery);
            if (insertUserResult.rowCount > 0 && insertPresenceResult.rowCount > 0) {
                return {
                    token: token
                };
            }
            else {
                return {
                    success: false,
                    reason: "Something went wrong while creating account."
                };
            }
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return {
                success: false,
                reason: "Something went wrong while creating account."
            };
        }
    }),
    checkAccount: (email, password) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let user = yield database.getAccountByEmail(email);
            if (user == null) {
                return {
                    success: false,
                    reason: "Email and/or password is invalid."
                };
            }
            let comparison = (0, bcrypt_1.compareSync)(password, user.password);
            if (!comparison) {
                return {
                    success: false,
                    reason: "Email and/or password is invalid."
                };
            }
            return {
                token: user.token
            };
        }
        catch (error) {
            (0, logger_1.logText)(error.toString(), "error");
            return {
                success: false,
                reason: "Something went wrong while checking account."
            };
        }
    }),
};
exports.default = database;
