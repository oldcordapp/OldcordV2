import { Pool } from 'pg';
import { logText } from './logger';
import globalUtils from './global';
import { genSalt, hash, compareSync } from 'bcrypt';
import Snowflake from './snowflake';
import Database from '../interfaces/database';
import Guild from '../interfaces/guild';
import Ban from '../interfaces/guild/ban';
import * as fs from 'fs'
import * as md5 from 'md5';
import Channel from '../interfaces/guild/channel';
import Member from '../interfaces/guild/member';
import Role from '../interfaces/guild/role';
import Presence from '../interfaces/presence';
import User from '../interfaces/user';
import Message from '../interfaces/guild/message';
import * as path from 'path';
import UploadAttachment from '../interfaces/uploadattachment';
import Attachment from '../interfaces/guild/attachment';
import Permission_Overwrite from '../interfaces/guild/permission_overwrite';
import Invite from '../interfaces/guild/invite';
import config from './config';
import gateway from '../gateway';

const configuration = {
    host: 'localhost',
    port: 5433,
    database: 'db_here',
    user: 'postgres',
    password: 'pw_here'
}

const pool = new Pool(configuration);

const database: Database = {
    client: null,
    runQuery: async (queryString: string, values?: any[]) => {
        if (database.client == null) {
            database.client = await pool.connect();
            database.client.on('error', () => {});
            database.client.connection.on('error', () => {});
        }
        
        try {
            const query = {
                text: queryString,
                values: values
            };

            const result = await database.client.query(query);
            const rows = result.rows;

            if (rows.length === 0) {
                return null;
            }
    
            return rows;
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    setupDatabase: async () => {
        try {
            await database.runQuery(`
                CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT,
                discriminator TEXT,
                email TEXT,
                password TEXT,
                token TEXT,
                verified INTEGER DEFAULT 0,
                created_at TEXT DEFAULT NULL,
                avatar TEXT DEFAULT NULL,
                settings TEXT DEFAULT 'INLINE_EMBED_MEDIA:1,INLINE_ATTACHMENT_MEDIA:1,RENDER_EMBEDS:1,ENABLE_TTS_COMMAND:1,THEME:DARK'
            );`, []);

            /*
            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS presences (
                user_id TEXT,
                guild_id TEXT DEFAULT NULL,
                game TEXT DEFAULT NULL,
                status TEXT DEFAULT 'offline'
            );`, []);
            */ //why was this needed? all the presences can be handled at runtime, why do they need to be stored - good question for past me

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS channels (
                id TEXT,
                type TEXT DEFAULT 'text',
                guild_id TEXT,
                topic TEXT DEFAULT NULL,
                last_message_id TEXT DEFAULT '0',
                recipient_id TEXT DEFAULT NULL,
                is_private INTEGER DEFAULT 0,
                permission_overwrites TEXT,
                name TEXT,
                position INTEGER DEFAULT 0
            );`, []);

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS closed_channels (
                user_id TEXT,
                channel_id TEXT
            );`, []);

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS permissions (
                channel_id TEXT,
                overwrite TEXT DEFAULT NULL
            );`, []);

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS guilds (
                id TEXT PRIMARY KEY,
                name TEXT,
                icon TEXT DEFAULT NULL,
                region TEXT DEFAULT NULL,
                owner_id TEXT,
                afk_channel_id TEXT,
                afk_timeout INTEGER DEFAULT 300,
                creation_date TEXT
            );`, []);

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS roles (
                guild_id TEXT,
                role_id TEXT,
                name TEXT,
                permissions INTEGER DEFAULT 104193089,
                position INTEGER DEFAULT 0
            );`, []);

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS members (
                guild_id TEXT,
                user_id TEXT,
                nick TEXT DEFAULT NULL,
                roles TEXT DEFAULT NULL,
                joined_at TEXT DEFAULT NULL,
                deaf INTEGER DEFAULT 0,
                mute INTEGER DEFAULT 0
            );`, []);

            await database.runQuery(`
            CREATE TABLE IF NOT EXISTS invites (
                guild_id TEXT,
                channel_id TEXT,
                code TEXT,
                temporary INTEGER DEFAULT 0,
                revoked INTEGER DEFAULT 0,
                inviter_id TEXT,
                uses INTEGER DEFAULT 0,
                maxUses INTEGER DEFAULT 0,
                maxAge INTEGER DEFAULT 0,
                xkcdpass INTEGER DEFAULT 0,
                createdAt TEXT
            );`, []);

            await database.runQuery(`CREATE TABLE IF NOT EXISTS messages (
                guild_id TEXT,
                message_id TEXT,
                channel_id TEXT,
                author_id TEXT,
                content TEXT,
                edited_timestamp TEXT DEFAULT NULL,
                mention_everyone INTEGER DEFAULT 0,
                nonce TEXT,
                timestamp TEXT,
                tts INTEGER DEFAULT 0
            );`, []);

            await database.runQuery(`CREATE TABLE IF NOT EXISTS attachments (
                attachment_id TEXT,
                message_id TEXT,
                filename TEXT,
                height INTEGER,
                width INTEGER,
                size INTEGER,
                url TEXT
            );`, []);

            await database.runQuery(`CREATE TABLE IF NOT EXISTS widgets (
                guild_id TEXT,
                channel_id TEXT DEFAULT NULL,
                enabled INTEGER DEFAULT 0
            );`, []);

            await database.runQuery(`CREATE TABLE IF NOT EXISTS bans (
                guild_id TEXT,
                user_id TEXT
            );`, []);

            await database.runQuery(`
                CREATE TABLE IF NOT EXISTS tutorial (
                user_id TEXT PRIMARY KEY,
                indicators_suppressed INTEGER DEFAULT 0,
                indicators_confirmed TEXT DEFAULT NULL
            );`, []);

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getUserCount: async () => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM users
            `, []);

            if (rows != null && rows.length > 0) {
                return rows.length;
            }

            return 0;
        }
        catch (error: any) {
            logText(error.toString(), "error");

            return 0;
        }
    },
    getServerCount: async () => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM guilds
            `, []);

            if (rows != null && rows.length > 0) {
                return rows.length;
            }

            return 0;
        }
        catch (error: any) {
            logText(error.toString(), "error");

            return 0;
        }
    },
    getMessageCount: async () => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM messages
            `, []);

            if (rows != null && rows.length > 0) {
                return rows.length;
            }

            return 0;
        }
        catch (error: any) {
            logText(error.toString(), "error");

            return 0;
        }
    },
    getNewUsersToday: async () => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
            const formattedTimestamp = twentyFourHoursAgo.toISOString();
    
            const rows = await database.runQuery(`
                SELECT * FROM users
                WHERE created_at >= $1
            `, [formattedTimestamp]);
    
            if (rows != null && rows.length > 0) {
                return rows.length;
            }
    
            return 0;
        }
        catch (error: any) {
            logText(error.toString(), "error");
    
            return 0;
        }
    },
    getNewServersToday: async () => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
            const formattedTimestamp = twentyFourHoursAgo.toISOString();
    
            const rows = await database.runQuery(`
                SELECT * FROM guilds
                WHERE creation_date >= $1
            `, [formattedTimestamp]);
    
            if (rows != null && rows.length > 0) {
                return rows.length;
            }
    
            return 0;
        }
        catch (error: any) {
            logText(error.toString(), "error");
    
            return 0;
        }
    },
    getNewMessagesToday: async () => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
            const formattedTimestamp = twentyFourHoursAgo.toISOString();
    
            const rows = await database.runQuery(`
                SELECT * FROM messages
                WHERE timestamp >= $1
            `, [formattedTimestamp]);
    
            if (rows != null && rows.length > 0) {
                return rows.length;
            }
    
            return 0;
        }
        catch (error: any) {
            logText(error.toString(), "error");
    
            return 0;
        }
    },
    getAccountByEmail: async (email: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM users WHERE email = $1
            `, [email]);

            if (rows != null && rows.length > 0) {
                return {
                    id: rows[0].id,
                    username: rows[0].username,
                    discriminator: rows[0].discriminator,
                    avatar: rows[0].avatar == 'NULL' ? null : rows[0].avatar,
                    email: rows[0].email,
                    password: rows[0].password,
                    token: rows[0].token,
                    verified: rows[0].verified == 1 ? true : false,
                    created_at: rows[0].created_at,
                    settings: rows[0].settings
                };
            } else {
                return null;
            }
        } catch (error: any) {  
            logText(error.toString(), "error");

            return null;
        }
    },
    banMember: async (guild_id: string, user_id: string) => {
        try {
            await database.runQuery(`
                INSERT INTO bans (guild_id, user_id) VALUES ($1, $2)
            `, [guild_id, user_id]);

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    unbanMember: async (guild_id: string, user_id: string) => {
        try {
            await database.runQuery(`
                DELETE FROM bans WHERE guild_id = $1 AND user_id = $2
            `, [guild_id, user_id]);

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getAccountByToken: async (token: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM users WHERE token = $1
            `, [token]);

            if (rows != null && rows.length > 0) {
                return {
                    id: rows[0].id,
                    username: rows[0].username,
                    discriminator: rows[0].discriminator,
                    avatar: rows[0].avatar == 'NULL' ? null : rows[0].avatar,
                    email: rows[0].email,
                    password: rows[0].password,
                    token: rows[0].token,
                    verified: rows[0].verified == 1 ? true : false,
                    created_at: rows[0].created_at,
                    settings: rows[0].settings
                };
            } else {
                return null;
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getAccountsByUsername: async (username: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM users WHERE username = $1
            `, [username]);

            if (rows != null && rows.length > 0) {
                const ret: User[] = [];

                for(var row of rows) {
                    ret.push({
                        id: row.id,
                        username: row.username,
                        discriminator: row.discriminator,
                        avatar: row.avatar == 'NULL' ? null : row.avatar,
                        email: row.email,
                        password: row.password,
                        token: row.token,
                        verified: row.verified == 1 ? true : false,
                        created_at: row.created_at,
                        settings: row.settings
                    })
                }

                return ret;
            } else {
                return [];
            }
        } catch (error: any) {  
            logText(error.toString(), "error");

            return [];
        }
    },
    getAccountByUserId: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM users WHERE id = $1
            `, [id]);

            if (rows != null && rows.length > 0) {
                return {
                    id: rows[0].id,
                    username: rows[0].username,
                    discriminator: rows[0].discriminator,
                    email: rows[0].email,
                    password: rows[0].password,
                    token: rows[0].token,
                    verified: rows[0].verified == 1 ? true : false,
                    created_at: rows[0].created_at,
                    avatar: rows[0].avatar == 'NULL' ? null : rows[0].avatar
                };
            } else {
                return null;
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getGuildChannels: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM channels WHERE guild_id = $1
            `, [id]);

            if (rows != null && rows.length > 0) {
                const ret: Channel[] = [];

                for(var row of rows) {
                    const perms: Permission_Overwrite[] = await database.getChannelPermissionOverwrites(row.id);

                    ret.push({
                        id: row.id,
                        name: row.name,
                        guild_id: row.guild_id == 'NULL' ? null : row.guild_id,
                        type: row.type,
                        topic: row.topic == 'NULL' ? null : row.topic,
                        last_message_id: row.last_message_id,
                        recipient: row.recipient_id == 'NULL' ? null : {
                            id: row.recipient_id
                        },
                        is_private: row.is_private == 1 ? true : false,
                        permission_overwrites: perms,
                        position: row.position
                    })
                }

                return ret;
            } else {
                return [];
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    getRoleById: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM roles WHERE role_id = $1
            `, [id]);

            if (rows != null && rows.length > 0) {
                return {
                    id: rows[0].role_id,
                    name: rows[0].name,
                    permissions: rows[0].permissions,
                    position: rows[0].position
                }
            } else {
                return null;
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getGuildBans: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM bans WHERE guild_id = $1
            `, [id]);
    
            if (rows != null && rows.length > 0) {
                const ret: Ban[] = [];

                for(var row of rows) {
                    const user = await database.getAccountByUserId(row.user_id);

                    if (user != null) {
                        ret.push({
                            user: {
                                username: user.username,
                                avatar: user.avatar,
                                id: user.id,
                                discriminator: user.discriminator
                            }
                        });
                    }
                }

                return ret;
            } else {
                return [];
            }
        } catch (error: any) {
            logText(error.toString(), "error");
    
            return [];
        }
    },
    getGuildRoles: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM roles WHERE guild_id = $1
            `, [id]);

            if (rows != null && rows.length > 0) {
                const ret: Role[] = [];

                for(var row of rows) {
                    const role = await database.getRoleById(row.role_id);

                    if (role != null) {
                        ret.push(role);
                    }
                }

                return ret;
            } else {
                return [];
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    getGuildPresences: async (id: string) => {
        try {
            const guildMembers = await database.getGuildMembers(id);

            if (guildMembers == null || guildMembers.length == 0) {
                return [];
            }

            const ret: Presence[] = [];

            for(var member of guildMembers) {
                const client = gateway.clients.filter(x => x.user.id == member.id)[0];

                if (client == null || !client.presence) {
                    ret.push({                             
                        game: null,
                        status: 'offline',
                        user: {
                            avatar: member.user.avatar,
                            discriminator: member.user.discriminator,
                            id: member.user.id,
                            username: member.user.username
                        }
                    });
                } else ret.push(client.presence);
            }

            return ret;
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    createChannel: async (guild_id: string, name: string, type: string) => {
        try {
            const channel_id = Snowflake.generate();

            await database.runQuery(`INSERT INTO channels (id, type, guild_id, topic, last_message_id, recipient_id, is_private, permission_overwrites, name, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [channel_id, type, guild_id, 'NULL', '0', 'NULL', 0, 'NULL', name, 0])

            const channel = await database.getChannelById(channel_id);

            if (channel == null) {
                return null;
            }

            return channel;
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    updateChannel: async (channel_id: string, channel: Channel) => {
        try {
            let overwrites: string = 'NULL';

            if (channel.permission_overwrites) {
                let out = globalUtils.SerializeOverwritesToString(channel.permission_overwrites);

                if (out != null) {
                    overwrites = out;
                }
            }

            await database.runQuery(`UPDATE channels SET type = $1, id = $2, guild_id = $3, last_message_id = $4, name = $5, topic = $6, recipient_id = $7, permission_overwrites = $8, position = $9, is_private = $10 WHERE id = $11`, [channel.type, channel.id, channel.guild_id, channel.last_message_id, channel.name, channel.topic, channel.recipient == null ? 'NULL' : channel.recipient.id, overwrites, channel.position, channel.is_private == true ? 1 : 0, channel_id]);

            return true;    
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getGuildMembers: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM members WHERE guild_id = $1
            `, [id]);

            let guild_roles: Role[] = await database.getGuildRoles(id);

            if (rows != null && rows.length > 0) {
                const ret: Member[] = [];

                for(var row of rows) {
                    const roles: string[] = [];
                    
                    if (row.roles.includes(':')) {
                        const db_roles = row.roles.split(':');
                        
                        for(var db_role of db_roles) {
                            const role = await database.getRoleById(db_role);

                            if (role != null && guild_roles.find(x => x.id == role.id)) {
                                roles.push(role.id);
                            }
                        }
                    } else {
                        const role = await database.getRoleById(row.roles);

                        if (role != null && guild_roles.find(x => x.id == role.id)) {
                            roles.push(role.id);
                        }
                    }

                    const user = await database.getAccountByUserId(row.user_id);
                    
                    if (user != null) {
                        delete user.email;
                        delete user.password;
                        delete user.token;
                        delete user.settings;
                        delete user.verified;
                        delete user.created_at;

                        let everyoneRole = guild_roles.find(x => x.name == '@everyone');

                        if (everyoneRole != null && !roles.includes(everyoneRole.id)) {
                            roles.push(everyoneRole.id);
                        }

                        ret.push({
                            id: row.user_id,
                            nick: row.nick == 'NULL' ? null : row.nick,
                            deaf: ((row.deaf == 'TRUE' || row.deaf == 1) ? true : false),
                            mute: ((row.mute == 'TRUE' || row.mute == 1) ? true : false),
                            roles: roles,
                            user: user
                        })
                    }
                }

                return ret;
            } else {
                return [];
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    getClosedDMChannels: async(user_id: string) => {
        try {
            const rows = await database.runQuery(`SELECT * FROM closed_channels WHERE user_id = $1`, [user_id]);
            const channels: Channel[] = [];

            if (rows != null && rows.length > 0) {
                for(var row of rows) {
                    let channel = await database.getChannelById(row.channel_id);

                    if (channel != null) {
                        channels.push(channel);
                    }
                }

                return channels;
            } else {
                return [];
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    isDMClosed: async (user_id: string, channel_id: string) => {
        try {
            let closedChannels: Channel[] = await database.getClosedDMChannels(user_id);

            let channel = closedChannels.filter(x => x.id == channel_id);

            if (channel.length == 0) {
                return false;
            }

            return true;
        }
        catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    closeDMChannel: async (user_id: string, channel_id: string) => {
        try {
            let alreadyClosed = await database.isDMClosed(user_id, channel_id);

            if (alreadyClosed) {
                return true;
            }

            await database.runQuery(`INSERT INTO closed_channels (user_id, channel_id) VALUES ($1, $2)`, [user_id, channel_id]);

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getGuildMemberById: async (guild_id: string, id: string) => {
        try {
            const members: Member[] = await database.getGuildMembers(guild_id);

            if (members.length == 0 || members == null) {
                return null;
            }

            const member = members.find(x => x.id == id);

            if (!member) {
                return null;
            }

            delete member.user.created_at;
            delete member.user.email;
            delete member.user.password;
            delete member.user.settings;
            delete member.user.token;
            delete member.user.verified; // just in case

            return member;
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getUsersMessagesInGuild: async (guild_id: string, author_id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM messages WHERE author_id = $1 AND guild_id = $2
            `, [author_id, guild_id]);

            if (rows == null || rows.length == 0) {
                return [];
            }

            const ret: Message[] = [];

            for(var row of rows) {
                const message = await database.getMessageById(row.message_id);

                if (message != null) {
                    ret.push(message);
                }
            }

            return ret;
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    getMessageById: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM messages WHERE message_id = $1
            `, [id]);

            if (rows == null || rows.length == 0) {
                return null;
            }

            const author = await database.getAccountByUserId(rows[0].author_id);

            if (author == null) {
                return null;
            }

            delete author.created_at;
            delete author.settings;
            delete author.token;
            delete author.email;
            delete author.password;
            delete author.verified;

            const mentions: User[] = [];
            const mention_ids: string[] = [];

            if (rows[0].content.includes("<@")) {
                const regex = /<@(\d+)>/g;

                let match: RegExpExecArray | null;

                while ((match = regex.exec(rows[0].content))) {
                    if (match != null) {
                        mention_ids.push(match[1]);
                    }
                }
            }

            if (mention_ids.length > 0) {
                for(var mention_id of mention_ids) {
                    const mention = await database.getAccountByUserId(mention_id);

                    if (mention != null) {
                        delete mention.created_at;
                        delete mention.settings;
                        delete mention.token;
                        delete mention.email;
                        delete mention.password;
                        delete mention.verified;

                        mentions.push(mention);
                    }
                }
            }

            const attachments = await database.runQuery(`
                SELECT * FROM attachments WHERE message_id = $1
            `, [id]);

            const messageAttachments: Attachment[] = [];

            if (attachments != null && attachments.length > 0) {
                for(var attachment of attachments) {
                    messageAttachments.push({
                        filename: attachment.filename,
                        height: attachment.height,
                        width: attachment.width,
                        id: attachment.attachment_id,
                        proxy_url: attachment.url,
                        url: attachment.url,
                        size: attachment.size
                    })
                }
            }

            return {
                id: rows[0].message_id,
                content: rows[0].content,
                channel_id: rows[0].channel_id,
                author: author,
                attachments: messageAttachments,
                embeds: [],
                mentions: mentions,
                mention_everyone: rows[0].content.includes("@everyone"),
                nonce: rows[0].nonce,
                edited_timestamp: rows[0].edited_timestamp == 'NULL' ? null : rows[0].edited_timestamp,
                timestamp: rows[0].timestamp,
                tts: rows[0].tts == 1 ? true : false
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getChannelMessages: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM messages WHERE channel_id = $1 ORDER BY timestamp DESC
            `, [id]);

            if (rows == null || rows.length == 0) {
                return [];
            }

            const ret: Message[] = [];

            for(var row of rows) {

                const message = await database.getMessageById(row.message_id);

                if (message != null) {
                    ret.push(message);
                }
            }

            return ret;
        } catch (error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    getChannelById: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM channels WHERE id = $1
            `, [id]);

            if (rows == null || rows.length == 0) {
                return null;
            }

            const overwrites: Permission_Overwrite[] = [];

            if (rows[0].permission_overwrites.includes(":")) {
                for(let overwrite of rows[0].permission_overwrites.split(":")) {
                    let role_id = overwrite.split('_')[0];
                    let allow_value = overwrite.split('_')[1];
                    let deny_value = overwrite.split('_')[2];

                    overwrites.push({
                        id: role_id,
                        allow: parseInt(allow_value),
                        deny: parseInt(deny_value),
                        type: overwrite.split('_')[3] ? overwrite.split('_')[3] : 'role'
                    });
                }
            } else if (rows[0].permission_overwrites != "NULL") {
                let overwrite = rows[0].permission_overwrites;
                let role_id = overwrite.split('_')[0];
                let allow_value = overwrite.split('_')[1];
                let deny_value = overwrite.split('_')[2];

                overwrites.push({
                    id: role_id,
                    allow: parseInt(allow_value),
                    deny: parseInt(deny_value),
                    type: overwrite.split('_')[3] ? overwrite.split('_')[3] : 'role'
                });
            }

            return {
                id: rows[0].id,
                name: rows[0].name,
                guild_id: rows[0].guild_id == 'NULL' ? null : rows[0].guild_id,
                type: rows[0].type,
                topic: rows[0].topic == 'NULL' ? null : rows[0].topic,
                last_message_id: rows[0].last_message_id,
                recipient: rows[0].recipient_id == 'NULL' ? null : {
                    id: rows[0].recipient_id
                },
                is_private: rows[0].is_private == 1 ? true : false,
                permission_overwrites: overwrites,
                position: rows[0].position
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getGuildById: async (id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM guilds WHERE id = $1
            `, [id]);

            if (rows == null || rows.length == 0) {
                return null;
            }

            let channels = await database.getGuildChannels(id);

            if (channels == null || channels.length == 0) {
                return null;
            }

            let members = await database.getGuildMembers(id);

            if (members == null || members.length == 0) {
                return null;
            }

            let roles = await database.getGuildRoles(id);

            if (roles == null || roles.length == 0) {
                return null;
            }

            //let presences: any[] = [];
            let presences: Presence[] = await database.getGuildPresences(id);

            let fixed_presences: any[] = []

            if (presences.length > 0) {
                for(var pren of presences) {
                    fixed_presences.push({
                        guild_id: id,
                        game_id: pren.game != null ? pren.game : null,
                        user: {
                            avatar: pren.user.avatar,
                            discriminator: pren.user.discriminator,
                            id: pren.user.id,
                            username: pren.user.username
                        },
                        status: pren.status
                    })
                }
            }

            return {
                id: rows[0].id,
                name: rows[0].name,
                icon: rows[0].icon == 'NULL' ? null : rows[0].icon,
                region: rows[0].region,
                owner_id: rows[0].owner_id,
                afk_channel_id: rows[0].afk_channel_id == 'NULL' ? null : rows[0].afk_channel_id,
                afk_timeout: rows[0].afk_timeout,
                channels: channels,
                members: members,
                roles: roles,
                presences: presences,
                voice_states: []
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getUsersGuilds: async (id: string) => {
        try {
            const guilds: Guild[] = [];
            const members = await database.runQuery(`
                SELECT * FROM members WHERE user_id = $1
            `, [id]);

            if (members != null && members.length > 0) {
                for(var member of members) {
                    let guild = await database.getGuildById(member.guild_id);

                    if (guild != null && 'id' in guild) {
                        let channels = await database.getGuildChannels(member.guild_id);

                        if (channels != null && channels.length > 0) {
                            guild.channels = channels;
                        }

                        //to-do; this better

                        guilds.push(guild);
                    }
                }

                return guilds;
            } else {
                return [];
            }
        } catch(error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    updateGuildWidget: async (guild_id: string, channel_id: string | null, enabled: boolean) => {
        try {
            if (channel_id == null) {
                channel_id = 'NULL'
            }

            await database.runQuery(`UPDATE widgets SET channel_id = $1, enabled = $2 WHERE guild_id = $3`, [channel_id, enabled == true ? 1 : 0, guild_id]);

            return true;    
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getGuildWidget: async (guild_id: string) => {
        try {
            const rows = await database.runQuery(`SELECT * FROM widgets WHERE guild_id = $1`, [guild_id]);

            if (rows == null || rows.length == 0) {
                return null;
            }

            return {
                channel_id: rows[0].channel_id == 'NULL' ? null : rows[0].channel_id,
                enabled: rows[0].enabled == 1 ? true : false,
            }
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getChannelPermissionOverwrites: async (channel_id: string) => {
        try {
            const channel = await database.getChannelById(channel_id);

            if (channel == null || !channel.permission_overwrites) {
                return [];
            }

            if (channel.permission_overwrites.length == 0) {
                return [];
            }

            return channel.permission_overwrites;
        } catch(error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    getInvite: async (code: string) => {
        try {
            const rows = await database.runQuery(`SELECT * FROM invites WHERE code = $1`, [code]);

            if (rows == null || rows.length == 0) {
                return null;
            }

            const guy = await database.getAccountByUserId(rows[0].inviter_id);

            if (guy == null) {
                return null;
            }

            const guild = await database.getGuildById(rows[0].guild_id);

            if (guild == null) {
                return null;
            }

            const channel = await database.getChannelById(rows[0].channel_id);

            if (channel == null) {
                return null;
            }

            delete guy.created_at;
            delete guy.email;
            delete guy.password;
            delete guy.token;
            delete guy.settings;
            delete guy.verified;
            delete guild.afk_channel_id;
            delete guild.afk_timeout;
            delete guild.channels;
            delete guild.joined_at;
            delete guild.members;
            delete guild.presences;
            delete guild.region;
            delete guild.roles;
            delete guild.voice_states;
            delete channel.guild_id;
            delete channel.is_private;
            delete channel.last_message_id;
            delete channel.permission_overwrites;
            delete channel.position;
            delete channel.recipient;
            delete channel.topic;

            return {
                code: rows[0].code,
                temporary: rows[0].temporary == 1 ? true : false,
                revoked: rows[0].revoked == 1 ? true : false,
                inviter: guy,
                max_age: rows[0].maxage,
                max_uses: rows[0].maxuses,
                uses: rows[0].uses,
                guild: guild,
                channel: channel
            } //                xkcdpass: rows[0].xkcdpass == 1 ? true : false, - bugs stuff
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    isBannedFromGuild: async (guild_id: string, user_id: string) => {
        try {
            const rows = await database.runQuery(`
                SELECT * FROM bans WHERE user_id = $1
            `, [user_id]);

            if (rows == null || rows.length == 0) {
                return false;
            }

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    useInvite: async(code: string, user_id: string) => {
        try {
            const invite = await database.getInvite(code);

            if (invite == null || invite.uses == undefined) {
                return false;
            }

            const user = await database.getAccountByUserId(user_id);

            if (user == null) {
                return false;
            }

            const member = await database.getGuildMemberById(invite.guild.id, user_id);

            if (member != null) {
                return true;
            }

            if (invite.max_uses && invite.max_uses != 0 && invite.uses >= invite.max_uses) {
                await database.deleteInvite(code);

                return false;
            }

            const isBanned = await database.isBannedFromGuild(invite.guild.id, user_id);

            if (isBanned) {
                return false;
            }

            const joinedGuild = await database.joinGuild(user_id, invite.guild.id);

            if (!joinedGuild) {
                return false;
            }

            invite.uses++;

            await database.runQuery(`UPDATE invites SET uses = $1 WHERE code = $2`, [invite.uses, invite.code]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    clearRoles: async (guild_id: string, user_id: string) => {
        try {
            const member = await database.getGuildMemberById(guild_id, user_id);

            if (!member) {
                return false;
            }

            if (member.roles.length == 0) {
                return false;
            }

            await database.runQuery(`UPDATE members SET roles = $1 WHERE user_id = $2`, ['NULL', user_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    addRole: async (guild_id: string, role_id: string, user_id: string) => {
        try {
            const role = await database.getRoleById(role_id);

            if (role == null) {
                return false;
            }

            if (role_id == guild_id) {
                return true; //everyone has the everyone role silly
            }

            const user = await database.getAccountByUserId(user_id);

            if (user == null) {
                return false;
            }

            const member = await database.getGuildMemberById(guild_id, user_id);

            if (member == null) {
                return false;
            }

            let roleStr = '';

            let stringRoles: string[] = member.roles;

            if (stringRoles.includes(role_id)) {
                return true;
            }

            if (member.roles.length > 1) {
                for(var role2 of member.roles) {
                    roleStr = roleStr + ':' + role2;
                }
            } else {
                roleStr = role_id;
            }

            if (roleStr.includes(":")) {
                roleStr = roleStr + ":" + role_id
            } else {
                roleStr = role_id;
            }

            roleStr = roleStr.replace(guild_id + ":", "")
            roleStr = roleStr.replace(guild_id, "")

            await database.runQuery(`UPDATE members SET roles = $1 WHERE user_id = $2`, [roleStr, user_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    joinGuild: async (user_id: string, guild_id: string) => {
        try {
            const guild = await database.getGuildById(guild_id);

            if (guild == null) {
                return false;
            }

            const user = await database.getAccountByUserId(user_id);

            if (user == null) {
                return false;
            }

            const member = await database.getGuildMemberById(guild_id, user_id);

            if (member != null) {
                return false;
            }

            const roles = await database.getGuildRoles(guild_id);

            if (!roles || roles.length == 0) {
                return false;
            }

            let everyone_role = roles.filter((x: Role) => x && x.name == "@everyone")[0];

            if (!everyone_role) {
                return false;
            }

            const date = new Date().toISOString();

            await database.runQuery(`INSERT INTO members (guild_id, user_id, nick, roles, joined_at, deaf, mute) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [guild_id, user_id, 'NULL', everyone_role.id, date, 0, 0]);

            //await database.runQuery(`INSERT INTO presences (user_id, game, status, guild_id) VALUES ($1, $2, $3, $4)`, [user.id, 'NULL', 'online', guild.id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getChannelInvites: async (channel_id: string) => {
        try {
            const rows = await database.runQuery(`SELECT * FROM invites WHERE channel_id = $1`, [channel_id]);

            if (rows == null || rows.length == 0) {
                return [];
            }

            const ret: Invite[] = [];

            for(var row of rows) {
                const invite = await database.getInvite(row.code);

                if (invite != null) {
                    ret.push(invite);
                }
            }

            return ret;
        } catch(error: any) {
            logText(error.toString(), "error");
  
            return [];
        }
    },
    deleteInvite: async (code: string) => {
        try {
            const invite = await database.getInvite(code);

            if (invite == null) {
                return false;
            }

            await database.runQuery(`DELETE FROM invites WHERE code = $1`, [code]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    getGuildInvites: async (guild_id: string) => {
        try {
            const rows = await database.runQuery(`SELECT * FROM invites WHERE guild_id = $1`, [guild_id]);

            if (rows == null || rows.length == 0) {
                return [];
            }

            const ret: Invite[] = [];

            for(var row of rows) {
                const invite = await database.getInvite(row.code);

                if (invite != null) {
                    ret.push(invite);
                }
            }

            return ret;
        } catch(error: any) {
            logText(error.toString(), "error");

            return [];
        }
    },
    createInvite: async (guild_id: string, channel_id: string, inviter_id: string, temporary: boolean, maxUses: number, maxAge: number, xkcdpass: boolean, force_regenerate: boolean) => {
        try {
            const guild = await database.getGuildById(guild_id);

            if (guild == null) {
                return null;
            }

            const channel = await database.getChannelById(channel_id);

            if (channel == null || channel.guild_id != guild.id) {
                return null;
            }

            const user = await database.getAccountByUserId(inviter_id);

            if (user == null) {
                return null;
            }

            let code = "";

            if (xkcdpass) {
                code = globalUtils.generateMemorableInviteCode();
            } else {
                code = globalUtils.generateString(16);
            }

            const date = new Date().toISOString();

            if (!force_regenerate) {
                const existingInvites = await database.runQuery(`SELECT * FROM invites WHERE guild_id = $1 AND channel_id = $2 AND revoked = $3 AND inviter_id = $4 AND maxuses = $5 AND xkcdpass = $6 AND maxage = $7`, [guild_id, channel_id, temporary == true ? 1 : 0, inviter_id, maxUses, xkcdpass == true ? 1 : 0, maxAge]);

                if (existingInvites != null && existingInvites != 'NULL' && existingInvites.length > 0) {
                    let code = existingInvites[0].code;
    
                    const invite = await database.getInvite(code);
    
                    if (invite == null) {
                        return null;
                    }
        
                    return invite;
                }
            }
            
            await database.runQuery(`INSERT INTO invites (guild_id, channel_id, code, temporary, revoked, inviter_id, uses, maxuses, maxage, xkcdpass, createdat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [guild_id, channel_id, code, temporary == true ? 1 : 0, 0, inviter_id, 0, maxUses, maxAge, xkcdpass == true ? 1 : 0, date]);

            const invite = await database.getInvite(code);
    
            if (invite == null) {
                return null;
            }
    
            return invite;
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getTutorial: async (user_id: string) => {
        try {
            const tut = await database.runQuery(`SELECT * FROM tutorial WHERE user_id = $1`, [user_id]);

            if (tut != null && tut.length > 0) {
                const indicators: string[] = [];

                if (tut[0].indicators_confirmed != 'NULL' && tut[0].indicators_confirmed.includes(':')) {
                    for(var indicator_confirmed of tut[0].indicators_confirmed.split(':')) {
                        indicators.push(indicator_confirmed)
                    }
                }

                return {
                    indicators_suppressed: tut[0].indicators_suppressed == 1,
                    indicators_confirmed: indicators
                }
            } else {
                return null;
            }
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    getDMChannels: async (user_id: string) => {
        try {
            const ret: Channel[] = [];
    
            const channels_one = await database.runQuery(`SELECT * FROM channels WHERE recipient_id = $1`, [user_id]);

            if (channels_one && Array.isArray(channels_one)) {
                for (const row of channels_one) {
                    const channels_two = await database.runQuery(`SELECT * FROM channels WHERE id = $1 AND recipient_id <> $2`, [row.id, user_id]);

                    if (channels_two.length > 0) {
                        let chan = await database.getChannelById(channels_two[0].id);
    
                        if (chan != null && chan.recipient != null) {
                            chan.recipient.id = channels_two[0].recipient_id; 

                            ret.push(chan);
                        }
                    }
                }
            }

            return ret;
        } catch (error: any) {
            logText(error.toString(), "error");
            return [];
        }
    },
    updateSettings: async (user_id: string, new_settings: string) => {
        try {
            await database.runQuery(`
                UPDATE users SET settings = $1 WHERE id = $2
            `, [new_settings, user_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    deleteRole: async (role_id: string) => {
        try {
            await database.runQuery(`DELETE FROM roles WHERE role_id = $1`, [role_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    createDMChannel: async (sender_id: string, recipient_id: string) => {
        try {
            const channel_id = Snowflake.generate();

            await database.runQuery(`INSERT INTO channels (id, type, guild_id, topic, last_message_id, recipient_id, is_private, permission_overwrites, name, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [channel_id, 'text', 'NULL', 'NULL', '0', recipient_id, 1, 'NULL', recipient_id, 0])
            await database.runQuery(`INSERT INTO channels (id, type, guild_id, topic, last_message_id, recipient_id, is_private, permission_overwrites, name, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [channel_id, 'text', 'NULL', 'NULL', '0', sender_id, 1, 'NULL', sender_id, 0])

            const channel = await database.getChannelById(channel_id);

            if (channel == null) {
                return null;
            }

            return channel;
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    createRole: async (guild_id: string, name: string, permissions: number, position: number) => {
        try {
            const role_id = Snowflake.generate();

            //INSERT INTO tutorial_indicators_confirmed (user_id, value) VALUES ($1, $2)
            await database.runQuery(`INSERT INTO roles (guild_id, role_id, name, permissions, position) VALUES ($1, $2, $3, $4, $5)`, [guild_id, role_id, name, permissions, position]);

            const role = await database.getRoleById(role_id);

            if (role == null) {
                return null;
            }

            return role;
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    updateRole: async (role_id: string, name: string, permissions: number, position: number | null) => {
        try {
            if (position != null) {
                await database.runQuery(`UPDATE roles SET name = $1, permissions = $2, position = $3 WHERE role_id = $4`, [name, permissions, position, role_id]);
            } else {
                await database.runQuery(`UPDATE roles SET name = $1, permissions = $2 WHERE role_id = $3`, [name, permissions, role_id]);
            }

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    updateTutorial: async (user_id: string, indicators_suppressed: boolean, indicators_confirmed: string[]) => {
        try {
            let indicator_confirm = "";

            for(var indicator of indicators_confirmed) {
                indicator_confirm = indicator_confirm + indicator.toLowerCase() + ":" 
            }

            indicator_confirm = indicator_confirm.substring(indicator_confirm.lastIndexOf(':'), 0);

            indicator_confirm = indicator_confirm.replace(/"::"/g, ":");

            await database.runQuery(`
                UPDATE tutorial SET indicators_suppressed = $1, indicators_confirmed = $2 WHERE user_id = $3
            `, [indicators_suppressed == true ? 1 : 0, indicator_confirm, user_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    deleteChannelPermissionOverwrite: async (channel_id: string, overwrite: Permission_Overwrite) => {
        try {
            let current_overwrites: Permission_Overwrite[] = await database.getChannelPermissionOverwrites(channel_id);

            let findOverwrite = current_overwrites.findIndex(x => x.id == overwrite.id);

            if (findOverwrite === -1) {
                return false;
            }

            current_overwrites.splice(findOverwrite, 1);

            let serialized = globalUtils.SerializeOverwritesToString(current_overwrites);

            await database.runQuery(`
                UPDATE channels SET permission_overwrites = $1 WHERE id = $2
                `, [serialized, channel_id]);

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    updateChannelPermissionOverwrites: async (channel_id: string, overwrites: Permission_Overwrite[]) => {
        try {
            let current_overwrites: Permission_Overwrite[] = await database.getChannelPermissionOverwrites(channel_id);

            for(var i = 0; i < overwrites.length; i++) {
                let overwrite: Permission_Overwrite = overwrites[i];
                let old_overwrite = current_overwrites.findIndex(x => x.id == overwrite.id);

                if (old_overwrite === -1) {
                    current_overwrites.push(overwrite);
                } else {
                    current_overwrites[old_overwrite] = overwrite;
                }
            }

            let serialized = globalUtils.SerializeOverwritesToString(current_overwrites);

            await database.runQuery(`
                UPDATE channels SET permission_overwrites = $1 WHERE id = $2
                `, [serialized, channel_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    leaveGuild: async (user_id: string, guild_id: string) => {
        try {
            await database.runQuery(`DELETE FROM members WHERE guild_id = $1 AND user_id = $2`, [guild_id, user_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    deleteChannel: async (channel_id: string) => {
        try {
            await database.runQuery(`DELETE FROM invites WHERE channel_id = $1`, [channel_id]);
            await database.runQuery(`DELETE FROM messages WHERE channel_id = $1`, [channel_id]);
            await database.runQuery(`DELETE FROM permissions WHERE channel_id = $1`, [channel_id]);
            await database.runQuery(`DELETE FROM channels WHERE id = $1`, [channel_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    deleteMessage: async (message_id: string) => {
        try {
            const message = await database.getMessageById(message_id);

            if (message == null) {
                return false;
            }

            await database.runQuery(`DELETE FROM messages WHERE message_id = $1`, [message_id]);
            
            const attachments = await database.runQuery(`SELECT * FROM attachments WHERE message_id = $1`, [message_id]);

            if (attachments != null && attachments.length > 0) {
                for(var attachment of attachments) {
                    fs.readdirSync(`./user_assets/attachments/${message.channel_id}/${attachment.attachment_id}`).forEach((file) => {
                        const curPath = path.join(`./user_assets/attachments/${message.channel_id}/${attachment.attachment_id}`, file);
                        
                        fs.unlinkSync(curPath);
                    });

                    fs.rmdirSync(`./user_assets/attachments/${message.channel_id}/${attachment.attachment_id}`);

                    await database.runQuery(`DELETE FROM attachments WHERE attachment_id = $1`, [attachment.attachment_id]);
                }
            }

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    deleteGuild: async (guild_id: string) => {
        try {
            await database.runQuery(`DELETE FROM guilds WHERE id = $1`, [guild_id]);

            await database.runQuery(`DELETE FROM channels WHERE guild_id = $1`, [guild_id]);

            await database.runQuery(`DELETE FROM presences WHERE guild_id = $1`, [guild_id]);

            await database.runQuery(`DELETE FROM roles WHERE guild_id = $1`, [guild_id]);

            await database.runQuery(`DELETE FROM members WHERE guild_id = $1`, [guild_id]);

            await database.runQuery(`DELETE FROM widgets WHERE guild_id = $1`, [guild_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    createMessage: async (guild_id: string | null, channel_id: string, author_id: string, content: string, nonce: string, attachment: UploadAttachment | null, tts: boolean) => {
        try {
            const id = Snowflake.generate();
            const date = new Date().toISOString();

            const author = await database.getAccountByUserId(author_id);

            if (author == null) {
                return null;
            }

            if (content == undefined) {
                content = "";
            }

            let mentions_everyone = content.includes('@everyone') ? 1 : 0;

            let pCheck = await globalUtils.hasChannelPermissionTo(channel_id, author_id, "MENTION_EVERYONE");

            if (!pCheck) {
                mentions_everyone = 0;
            }

            await database.runQuery(`INSERT INTO messages (guild_id, message_id, channel_id, author_id, content, edited_timestamp, mention_everyone, nonce, timestamp, tts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                guild_id == null ? 'NULL' : guild_id,
                id,
                channel_id,
                author_id,
                content,
                'NULL',
                mentions_everyone,
                nonce,
                date,
                (tts ? 1 : 0)
            ]);

            await database.runQuery(`UPDATE channels SET last_message_id = $1 WHERE id = $2`, [id, channel_id]);

            if (attachment != null) {
                await database.runQuery(`INSERT INTO attachments (attachment_id, message_id, filename, height, width, size, url) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    attachment.id,
                    id,
                    attachment.name,
                    attachment.height,
                    attachment.width,
                    attachment.size,
                    `${config.use_wss ? 'https' : 'http'}://${config.base_url}${config.local_deploy ? `:${config.port}` : ''}/attachments/${channel_id}/${attachment.id}/${attachment.name}`
                ]);
            }

            const message = await database.getMessageById(id);

            if (message == null) {
                return null;
            }

            return message;
        } catch(error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    updateGuild: async (guild_id: string, afk_channel_id: string | null, afk_timeout: number, icon: string | null, name: string, region: string) => {
        try {
            let send_icon: string = 'NULL';

            if (icon != null) {
                if (icon.includes("data:image")) {
                    var extension = icon.split('/')[1].split(';')[0];
                    var imgData =  icon.replace(`data:image/${extension};base64,`, "");
                    var file_name = Math.random().toString(36).substring(2, 15) + Math.random().toString(23).substring(2, 5);
                    var hash = md5(file_name);
            
                    if (extension == "jpeg") {
                        extension = "jpg";
                    }
            
                    send_icon = hash.toString();
            
                    if (!fs.existsSync(`user_assets/icons`)) {
                        fs.mkdirSync(`user_assets/icons`, { recursive: true });
                    }
    
                    if (!fs.existsSync(`user_assets/icons/${guild_id}`)) {
                        fs.mkdirSync(`user_assets/icons/${guild_id}`, { recursive: true });
            
                        fs.writeFileSync(`user_assets/icons/${guild_id}/${hash}.${extension}`, imgData, "base64");
                    } else {
                        fs.writeFileSync(`user_assets/icons/${guild_id}/${hash}.${extension}`, imgData, "base64");
                    }
                } else {
                    send_icon = icon;
                }
            }

            await database.runQuery(`UPDATE guilds SET name = $1, icon = $2, region = $3, afk_channel_id = $4, afk_timeout = $5 WHERE id = $6`, [name, send_icon, region, (afk_channel_id == null ? 'NULL' : afk_channel_id), afk_timeout, guild_id]);

            return true;
        } catch(error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    createGuild: async (owner_id: string, icon: string | null, name: string, region: string | null) => {
        try {
            const id = Snowflake.generate();
            const date = new Date().toISOString();
            const owner = await database.getAccountByUserId(owner_id);

            if (owner == null) {
                return null;
            }

            delete owner.email;
            delete owner.created_at;
            delete owner.token;
            delete owner.settings;
            delete owner.password;

            if (icon != null) {
                var extension = icon.split('/')[1].split(';')[0];
                var imgData =  icon.replace(`data:image/${extension};base64,`, "");
                var file_name = Math.random().toString(36).substring(2, 15) + Math.random().toString(23).substring(2, 5);
                var hash = md5(file_name);
        
                if (extension == "jpeg") {
                    extension = "jpg";
                }
        
                icon = hash.toString();
        
                if (!fs.existsSync(`user_assets/icons`)) {
                    fs.mkdirSync(`user_assets/icons`, { recursive: true });
                }

                if (!fs.existsSync(`user_assets/icons/${id}`)) {
                    fs.mkdirSync(`user_assets/icons/${id}`, { recursive: true });
        
                    fs.writeFileSync(`user_assets/icons/${id}/${hash}.${extension}`, imgData, "base64");
                } else {
                    fs.writeFileSync(`user_assets/icons/${id}/${hash}.${extension}`, imgData, "base64");
                }
            }

            await database.runQuery(`INSERT INTO guilds (id, name, icon, region, owner_id, afk_channel_id, afk_timeout, creation_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [id, name, (icon == null ? 'NULL' : icon), (region == null ? "sydney" : region), owner_id, 'NULL', 300, date])
            await database.runQuery(`INSERT INTO channels (id, type, guild_id, topic, last_message_id, recipient_id, is_private, permission_overwrites, name, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [id, 'text', id, 'NULL', '0', 'NULL', 0, 'NULL', 'general', 0])
            //await database.runQuery(`INSERT INTO presences (user_id, game, status, guild_id) VALUES ($1, $2, $3, $4)`, [owner_id, 'NULL', 'online', id]);
            await database.runQuery(`INSERT INTO roles (guild_id, role_id, name, permissions, position) VALUES ($1, $2, $3, $4, $5)`, [id, id, '@everyone', 104193089, 0]); 
            await database.runQuery(`INSERT INTO members (guild_id, user_id, nick, roles, joined_at, deaf, mute) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, owner_id, 'NULL', id, date, 0, 0]);
            await database.runQuery(`INSERT INTO widgets (guild_id, channel_id, enabled) VALUES ($1, $2, $3)`, [id, 'NULL', 0]);

            return {
                afk_channel_id: null,
                afk_timeout: 300,
                channels: [{
                    type: 'text',
                    topic: null,
                    position: 0,
                    permission_overwrites: [],
                    name: 'general',
                    last_message_id: '0',
                    id: id,
                    guild_id: id,
                    recipient: null
                }],
                members: [{
                    deaf: false,
                    mute: false,
                    nick: null,
                    id: owner_id,
                    joined_at: date,
                    roles: [],
                    user: owner
                }],
                presences: [{
                    game: null,
                    status: "online",
                    user: owner,
                }],
                icon: icon,
                id: id,
                name: name,
                owner_id: owner_id,
                region: (region == null ? "sydney" : region),
                roles: [{
                    id: id,
                    name: "@everyone", 
                    permissions: 104193089,
                    position: 0
                }]
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return null;
        }
    },
    createAccount: async (username: string, email: string, password: string) => {
        try {
            let user = await database.getAccountByEmail(email);

            if (user != null) {
                return {
                    success: false,
                    reason: "Email is already registered."
                }
            }

            let users = await database.getAccountsByUsername(username);

            if (users.length == 9999) {
                return {
                    success: false,
                    reason: "Too many people have this username."
                }
            }

            let salt = await genSalt(10);
            let pwHash = await hash(password, salt);
            let id = Snowflake.generate();
            let date = new Date().toISOString();
            let discriminator = Math.round(Math.random() * 9999);

            while (discriminator < 1000) {
                discriminator = Math.round(Math.random() * 9999);
            }

            let token = globalUtils.generateToken(id, pwHash);

            await database.runQuery(`INSERT INTO users (id,username,discriminator,email,password,token,created_at,avatar,settings) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8)`, [id, username, discriminator.toString(), email, pwHash, token, date, 'INLINE_EMBED_MEDIA:1,INLINE_ATTACHMENT_MEDIA:1,RENDER_EMBEDS:1,ENABLE_TTS_COMMAND:1,THEME:DARK'])
            //await database.runQuery(`INSERT INTO presences (user_id, game, status, guild_id) VALUES ($1, NULL, 'online', 'NULL')`, [id]);
            await database.runQuery(`INSERT INTO tutorial (user_id, indicators_suppressed, indicators_confirmed) VALUES ($1, 0, 'NULL')`, [id]);

            return {
                token: token
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return {
                success: false,
                reason: "Something went wrong while creating account."
            }
        }
    },
    doesThisMatchPassword: async (password_raw: string, password_hash: string) => {
        try {
            let comparison = compareSync(password_raw, password_hash);

            if (!comparison) {
                return false;
            }

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    updateMessage: async (message_id: string, new_content: string) => {
        try {
            let date = new Date().toISOString();

            await database.runQuery(`UPDATE messages SET content = $1, edited_timestamp = $2 WHERE message_id = $3`, [new_content, date, message_id]);

            return true;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    updateAccount: async (avatar: string | null, email: string | null, username: string | null, password: string | null, new_password: string | null, new_email: string | null) => {
        try {
            if (email == null) {
                return false;
            }

            if (username == null) {
                return false;
            }

            const account = await database.getAccountByEmail(email);

            if (account == null || !account.password || !account.email) {
                return false;
            }

            let new_avatar = avatar;
            let new_email2 = email;
            let new_username = username;

            if (new_email != null) {
                new_email2 = new_email;
            }

            if (avatar != null && avatar.includes("data:image/")) {
                var extension = avatar.split('/')[1].split(';')[0];
                var imgData = avatar.replace(`data:image/${extension};base64,`, "");
                var name = Math.random().toString(36).substring(2, 15) + Math.random().toString(23).substring(2, 5);
                var name_hash = md5(name);
    
                if (extension == "jpeg") {
                    extension = "jpg";
                }
    
                new_avatar = name_hash.toString();
    
                if (!fs.existsSync(`./user_assets/avatars/${account.id}`)) {
                    fs.mkdirSync(`./user_assets/avatars/${account.id}`, { recursive: true });
                }
 
                fs.writeFileSync(`./user_assets/avatars/${account.id}/${name_hash}.${extension}`, imgData, "base64");

                await database.runQuery(`UPDATE users SET avatar = $1 WHERE id = $2`, [new_avatar, account.id]);
            } else if (avatar == null) {
                await database.runQuery(`UPDATE users SET avatar = $1 WHERE id = $2`, ['NULL', account.id]);
            }

            if ((new_email2 != account.email && new_username != account.username) || (new_email2 != account.email || new_username != account.username)) {
                if (password == null) {
                    return false;
                }

                const checkPassword = await database.doesThisMatchPassword(password, account.password);

                if (!checkPassword) {
                    return false;
                }

                if (new_password != null) {
                    const checkPassword = await database.doesThisMatchPassword(new_password, account.password);

                    if (checkPassword) {
                        return false;
                    }

                    let salt = await genSalt(10);
                    let newPwHash = await hash(new_password, salt);
                    let token = globalUtils.generateToken(account.id, newPwHash);
    
                    await database.runQuery(`UPDATE users SET username = $1, email = $2, password = $3, token = $4 WHERE id = $5`, [new_username, new_email2, newPwHash, token, account.id]);
                } else {
                    await database.runQuery(`UPDATE users SET username = $1, email = $2 WHERE id = $3`, [new_username, new_email2, account.id]);
                }

                return true;
            } else if (new_password != null) {
                const checkPassword = await database.doesThisMatchPassword(new_password, account.password);

                if (checkPassword) {
                    return false;
                }

                let salt = await genSalt(10);
                let newPwHash = await hash(new_password, salt);
                let token = globalUtils.generateToken(account.id, newPwHash);

                await database.runQuery(`UPDATE users SET username = $1, email = $2, password = $3, token = $4 WHERE id = $5`, [new_username, new_email2, newPwHash, token, account.id]);
                
                return true;
            }
            
            return false;
        } catch (error: any) {
            logText(error.toString(), "error");

            return false;
        }
    },
    checkAccount: async (email: string, password: string) => {
        try {
            let user = await database.getAccountByEmail(email);

            // IHATE TYPESCRIPT I HATE TYPESCRIPT I HATE TYPESCRIPT
            if (user == null || !user?.email || !user?.password || !user?.token || !user?.settings) {
                return {
                    success: false,
                    reason: "Email and/or password is invalid."
                }
            }
            
            let comparison = compareSync(password, user.password);

            if (!comparison) {
                return {
                    success: false,
                    reason: "Email and/or password is invalid."
                }
            }

            return {
                token: user.token
            }
        } catch (error: any) {
            logText(error.toString(), "error");

            return {
                success: false,
                reason: "Something went wrong while checking account."
            }
        }
    },
};

export default database;