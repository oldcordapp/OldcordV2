import config from './config';
import * as crypto from 'crypto';
import database from './database';
import encode from 'base64url'
import permissions from './permissions';
import Member from '../interfaces/guild/member';
import Role from '../interfaces/guild/role';
import Permission_Overwrite from '../interfaces/guild/permission_overwrite';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import gateway from '../gateway';
import Presence from '../interfaces/presence';
import rateLimit from 'express-rate-limit';
import Guild from '../interfaces/guild';

const globalUtils = {
    generateString(length: number) {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
    
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
    
        return result;
    },
    generateMemorableInviteCode() {
        let code = "";

        var words = [
            "karthus",
            "terrorblade",
            "remora",
            "archon",
            "phantom",
            "charmander",
            "azmodan",
            "landslide",
            "anivia",
            "biggs",
            "rosalina",
            "overlord",
            "sephiroth",
            "cloud",
            "tifa",
            "illidan",
            "jaina",
            "arthas",
            "sylvanas",
            "thrall",
            "invoker",
            "pudge",
            "crystal",
            "anti",
            "jinx",
            "lux",
            "zed",
            "yasuo",
            "ahri"
        ];

        for(var i = 0; i < 3; i++) {
            code += words[Math.floor(Math.random() * words.length)] + `-`
        };

        code = code.substring(code.lastIndexOf('-'), -1);

        return code;
    },  
    getAvatarURL (avatar_hash: string, user_id: string) {
        let files = fs.readdirSync(`./user_assets/avatars/${user_id}`);

        for(var file of files) {
            if (file.includes(avatar_hash)) {
                return `${config.use_wss ? 'https' : 'http'}://${config.base_url}${config.local_deploy ? `:${config.port}` : ''}/avatars/${user_id}/${avatar_hash}${path.extname(file)}`;
            }
        }

        return null;
    },
    b64Decode(text: string) {
        return Buffer.from(text).toString('base64');
    },
    b64Encode(text:string) {
        return Buffer.from(text, 'base64').toString('utf-8');
    },
    generateToken(user_id: string, passwordHash: string) {
        //sorry ziad but im stealing this from hummus source, love you
        //oh also this: https://user-images.githubusercontent.com/34555296/120932740-4ca47480-c6f7-11eb-9270-6fb3fbbd856c.png

        const key = `${config.token_secret}--${passwordHash}`;
        const timeStampBuffer = Buffer.allocUnsafe(4);
        
        timeStampBuffer.writeUInt32BE(((Math.floor(Date.now() / 1000)) - 1293840));

        const encodedTimeStamp = encode(timeStampBuffer);
        const encodedUserId = encode(user_id);
        const partOne = `${encodedUserId}.${encodedTimeStamp}`;
        const encryptedAuth = crypto.createHmac('sha3-224', key).update(partOne).digest();
        const encodedEncryptedAuth = encode(encryptedAuth);
        const partTwo = `${partOne}.${encodedEncryptedAuth}`;

        return partTwo;
    },
    async channelMiddleware(req: any, res: any, next: any) {
        let channel = req.channel;

        if (!channel) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        if (!channel.guild_id) {
            return next();
        }

        if (!req.params.guildid) {
            req.params.guildid = channel.guild_id;
        }

        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let member = await database.getGuildMemberById(channel.guild_id, sender.id);

        if (member == null) {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }

        let gCheck = await globalUtils.hasGuildPermissionTo(req.guild, member.id, "READ_MESSAGES");

        if (!gCheck) {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }

        let pCheck = await globalUtils.hasChannelPermissionTo(req.channel, req.guild, member.id, "READ_MESSAGES");

        if (!pCheck) {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }

        next();
    },
    flagToReason(flag: string) {
        let ret = "";

        switch(flag) {
            case "NO_REGISTRATION":
                ret = "Account registration is currently disabled on this instance. Please try again later."
                break;
            case "NO_GUILD_CREATION":
                ret = "Creating guilds is not allowed at this time. Please try again later."
                break;
            case "NO_INVITE_USE":
                ret = "You are not allowed to accept this invite. Please try again later."
                break;
            case "NO_INVITE_CREATION":
                ret = "Creating invites is not allowed. Please try again later."
                break;
        }

        return ret;
    },
    instanceMiddleware(flag_check: string) {
        return function (req: any, res: any, next: any) {
            let check = config.instance_flags.includes(flag_check);

            if (check) {
                return res.status(400).json({
                    code: 400,
                    message: globalUtils.flagToReason(flag_check)
                })
            }

            return next();
        }
    },
    rateLimitMiddleware(max: number, windowMs: number) {
        const rL = rateLimit({
            windowMs: windowMs,
            max: max,
            handler: (req: any, res: any) => {
                const retryAfter = Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()));
    
                res.status(429).json({
                    message: "You are being rate limited.",
                    retry_after: retryAfter,
                    global: true
                });
            }
        });
    
        return async function (req: any, res: any, next: any) {
            rL(req, res, () => {
                next();
            });
        }
    },
    guildPermissionsMiddleware(permission: string) {
        return async function (req: any, res: any, next: any) {
            const sender = req.account;

            if (sender == null) {
                return res.status(401).json({
                    code: 401,
                    message: "Unauthorized"
                });
            }

            if (!req.params.guildid) {
                return next(); //dm channel
            }

            const guild = req.guild;

            if (guild == null) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Guild"
                });
            }

            if (guild.owner_id == sender.id) {
                return next();
            }

            let check = await globalUtils.hasGuildPermissionTo(req.guild, sender.id, permission);

            if (!check) {
                return res.status(403).json({
                    code: 403,
                    message: "Missing Permissions"
                });
            }

            return next();
        }
    },
    channelPermissionsMiddleware(permission: string) {
        return async function (req: any, res: any, next: any) {
            //console.log("called within channel permissions middleware");

            const sender = req.account;

            if (sender == null) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            if (permission == "MANAGE_MESSAGES" && req.params.messageid) {
                let message = req.message;

                if (message == null) {
                    return res.status(404).json({
                        code: 404,
                        message: "Unknown Message"
                    });
                }

                if (message.author.id == sender.id) {
                    return next();
                }
            }

            const channel = req.channel;

            if (channel == null) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }

            if (!channel.guild_id && channel.recipient) {
                if (permission == "MANAGE_MESSAGES" && sender.id != channel.recipient.id) {
                    return res.status(403).json({
                        code: 403,
                        message: "Missing Permissions"
                    });
                }

                if (permission == "SEND_MESSAGES") {
                    const theirguilds: Guild[] = await database.getUsersGuilds(channel.recipient.id);
                    const myguilds: Guild[] = await database.getUsersGuilds(sender.id);

                    let share: boolean = false;

                    for (var their of theirguilds) {
                        if (their.members != null && their.members.length > 0) {
                            const theirmembers: Member[] = their.members;

                            if (theirmembers.filter(x => x.id == sender.id).length > 0) {
                                share = true;
                            }
                        }
                    }

                    for (var mine of myguilds) {
                        if (mine.members != null && mine.members.length > 0) {
                            const mymembers: Member[] = mine.members;

                            if (mymembers.filter(x => x.id == channel.recipient.id).length > 0) {
                                share = true;
                            }
                        }
                    }

                    //horrendous code
                    if (!share) {
                        return res.status(403).json({
                            code: 403,
                            message: "Missing Permissions"
                        });
                    }
                }

                return next();
            }

            let check = await globalUtils.hasChannelPermissionTo(channel, req.guild, sender.id, permission);

            if (!check) {
                return res.status(403).json({
                    code: 403,
                    message: "Missing Permissions"
                });
            }

            return next();
        }
    },
    async guildMiddleware(req: any, res: any, next: any) {
        if (!req.params.guildid) {
            return next();
        }

        let guild = req.guild;

        if (!guild) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Guild"
            });
        }

        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let member = await database.getGuildMemberById(guild.id, sender.id);

        if (member == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Guild"
            });
        }

        next();
    },
    async isInGuild(user_id: string, guild_id: string) {
        const guild = await database.getGuildById(guild_id);

        if (guild == null || !guild.members) {
            return false;
        }

        const members: Member[] = guild.members;

        return members.filter(x => x.id == user_id).length > 0;
    },
    async hasGuildPermissionTo(guild: any, user_id: string, key: string) {
        const member = await database.getGuildMemberById(guild.id, user_id);

        if (guild == null) {
            return false;
        }

        if (member == null) {
            return false;
        }

        if (guild.owner_id == member.id) {
            return true;
        }

        if (member.roles.length == 0) {
            return false;
        }

        const roles: string[] = member.roles;
        const gatheredRoles: Role[] = []

        for(var role2 of roles) {
            var role = await database.getRoleById(role2)

            if (role != null) {
                gatheredRoles.push(role)
            }
        }

        const highestRole = gatheredRoles[gatheredRoles.length - 1]; //because you cant move the roles, it is assumed that the last role the member possesses will be the highest.

        return permissions.has(highestRole.permissions, key);
    },
    async dispatchPresenceUpdate(user_id: string, new_status: string, game_id: null | string) {
        let user = await database.getAccountByUserId(user_id)

        if (user == null || !user.token) {
            return false;
        }

        let guilds = await database.getUsersGuilds(user.id);

        if (guilds.length == 0) {
            await gateway.dispatchEventTo(user.token, {
                op: 0,
                t: "PRESENCE_UPDATE",
                s: null,
                d: {
                    guild_id: null,
                    game_id: game_id,
                    user: {
                        avatar: user.avatar,
                        discriminator: user.discriminator,
                        id: user.id,
                        username: user.username
                    },
                    status: new_status
                }
              });

            return true;
        }

        for(var guild of guilds) {
            await gateway.dispatchEventInGuild(guild.id, {
                op: 0,
                t: "PRESENCE_UPDATE",
                s: null,
                d: {
                    guild_id: guild.id,
                    game_id: game_id,
                    user: {
                        avatar: user.avatar,
                        discriminator: user.discriminator,
                        id: user.id,
                        username: user.username
                    },
                    status: new_status
                }
            });
        }

        return true;
    },
    async hasChannelPermissionTo(channel: any, guild: any, user_id: string, key: string) {
        if (channel == null || !channel.guild_id) {
            return false;
        }

        if (guild == null) {
            return false;
        }

        const member = await database.getGuildMemberById(guild.id, user_id);

        if (member == null) {
            return false;
        }

        if (guild.owner_id == user_id) {
            return true;
        }

        let calc = 0;

        let memberRoles: Role[] = [];

        for(var role2 of member.roles) {
            var role = await database.getRoleById(role2)

            if (role != null) {
                memberRoles.push(role);

                calc |= role.permissions;
            }
        }

        if (channel.permission_overwrites != undefined && channel.permission_overwrites.length > 0 && !(calc & 8)) {
            let basePerms = Number(calc);
            let overwrites: Permission_Overwrite[] = channel.permission_overwrites;
            let everyone = overwrites?.find(x => x.type == 'role' && x.id == guild.id);

            if (everyone) {
                basePerms &= ~everyone.deny;
                basePerms |= everyone.allow;
            }

            let allow = 0;
            let deny = 0;

            for(let memberRole of memberRoles) {
                let overwrite = overwrites.find(x => x.type =='role' && x.id == memberRole.id);

                if (overwrite) {
                    allow |= overwrite.allow;
                    deny |= overwrite.deny;
                }
            }

            basePerms &= ~deny;
            basePerms |= allow;

            let memberOverwrites = overwrites.find(x => x.type == 'member' && x.id == member.id);

            if (memberOverwrites) {
                basePerms &= ~memberOverwrites.deny;
                basePerms |= memberOverwrites.allow;
            }

            calc = basePerms;
        }

        if (!!(calc & 8)) {
            return true;
        } //ADMINISTRATOR - This is mainly for support of newer clients such as ones in 2016, and 2017 as the 2015 client has no ADMINISTRATOR permission.

        return permissions.has(calc, key);
    },
    SerializeOverwriteToString(overwrite: Permission_Overwrite) {
        return `${overwrite.id}_${overwrite.allow.toString()}_${overwrite.deny.toString()}_${overwrite.type}`;
    },
    SerializeOverwritesToString(overwrites: Permission_Overwrite[]) {
        if (overwrites == null || overwrites.length == 0) {
            return null;
        }

        let ret: string = "";

        for(var overwrite of overwrites) {
            ret += `${globalUtils.SerializeOverwriteToString(overwrite)}:`;
        }

        ret = ret.slice(0, -1);

        return ret;
    }
};

export default globalUtils;