import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import messages from './messages';
import globalUtils from '../utils/global';
import Permission_Overwrite from '../interfaces/guild/permission_overwrite';
import Guild from '../interfaces/guild';
import permissions from '../utils/permissions';
import config from '../utils/config';


const router = express.Router({ mergeParams: true });

router.param('channelid', async (req: any, res: any, next: any, channelid: any) => {
    const channel = await database.getChannelById(channelid);

    if (channel == null) {
        let dmChannel = await database.getDMChannelById(channelid);

        if (dmChannel == null) {
            req.channel = null;
        } else {
            let user = await database.getAccountByToken(req.headers['authorization']);

            if (user != null) {
                if (dmChannel.author_of_channel_id == user.id) {
                    req.channel = {
                        id: dmChannel.id,
                        name: "", //dm channels have no name lol
                        topic: "",
                        position: 0,
                        recipient: {
                            id: dmChannel.receiver_of_channel_id
                        },
                        type: "text",
                        guild_id: null,
                        is_private: true,
                        permission_overwrites: [] 
                    }
                } else {
                    req.channel = {
                        id: dmChannel.id,
                        name: "", //dm channels have no name lol
                        topic: "",
                        position: 0,
                        recipient: {
                            id: dmChannel.author_of_channel_id
                        },
                        type: "text",
                        guild_id: null,
                        is_private: true,
                        permission_overwrites: [] 
                    }
                }
            } else req.channel = null;
        }
    } else {
        req.channel = channel;

        if (channel && channel.guild_id) {
            req.guild = await database.getGuildById(channel.guild_id);
        }
    }

    next();
});

router.post("/:channelid/typing", globalUtils.channelMiddleware, globalUtils.channelPermissionsMiddleware("SEND_MESSAGES"), globalUtils.rateLimitMiddleware(100, 1000 * 60), async (req: any, res: any) => {
    try {
        const typer = req.account;

        if (!typer || !typer.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const channel = req.channel;

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        if (channel.recipient != null) {
            await gateway.dispatchInDM(typer.id, channel.recipient.id, {
                op: 0,
                t: "TYPING_START",
                s: null,
                d: {
                    channel_id: req.params.channelid,
                    guild_id: channel.guild_id,
                    user_id: typer.id,
                    timestamp: new Date(),
                    member: null
                }
            })
    
            return res.status(204).send();
        } else {
            if (!channel.guild_id) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }
    
            await gateway.dispatchEventInChannel(channel.id, {
                op: 0,
                t: "TYPING_START",
                s: null,
                d: {
                    channel_id: req.params.channelid,
                    guild_id: channel.guild_id,
                    user_id: typer.id,
                    timestamp: new Date(),
                    member: {
                        id: typer.id,
                        roles: [],
                        deaf: false,
                        mute: false,
                        user: {
                            username: typer.username,
                            discriminator: typer.discriminator,
                            id: typer.id,
                            avatar: typer.avatar
                        }
                    }
                }
            });
    
            return res.status(204).send();
        }
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.patch("/:channelid", globalUtils.channelMiddleware, globalUtils.channelPermissionsMiddleware("MANAGE_CHANNELS"), globalUtils.rateLimitMiddleware(100, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (!sender || !sender || !sender.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const channel = req.channel;

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        if (!req.body.name) {
            return res.status(400).json({
                code: 404,
                name: "This field is required.",
            });
        } 

        if (req.body.name.length < 2) {
            return res.status(400).json({
                code: 400,
                name: "Must be between 2 and 32 characters",
            });
        }

        if (req.body.name.length > 32) {
            return res.status(400).json({
                code: 400,
                name: "Must be between 2 and 32 characters",
            });
        }

        channel.name = req.body.name;
        channel.position = req.body.position;

        const outcome = await database.updateChannel(channel.id, channel);

        if (channel == null || !outcome) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventInChannel(channel.id, {
            op: 0,
            t: "CHANNEL_UPDATE",
            s: null,
            d: channel
        });

        return res.status(200).json(channel);
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.get("/:channelid/invites", globalUtils.channelMiddleware, globalUtils.channelPermissionsMiddleware("MANAGE_CHANNELS"), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (!sender || !sender || !sender.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const invites = await database.getChannelInvites(req.params.channelid);

        return res.status(200).json(invites);
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.post("/:channelid/invites", globalUtils.channelMiddleware, globalUtils.channelPermissionsMiddleware("CREATE_INSTANT_INVITE"), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (!sender || !sender.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (config.instance_flags.includes("NO_INVITE_CREATION")) {
            return res.status(400).json({
                code: 400,
                message: "Creating invites is not allowed. Please try again later."
            })
        }

        let max_age: number = 0;
        let max_uses: number = 0;
        let temporary: boolean = false;
        let xkcdpass: boolean = false;
        let regenerate: boolean = false;

        if (req.body.max_age) {
            max_age = req.body.max_age;
        }

        if (req.body.max_uses) {
            max_uses = req.body.max_uses;
        }
    
        if (req.body.xkcdpass) {
            xkcdpass = req.body.xkcdpass;
        }

        if (req.body.tempoary) {
            temporary = req.body.temporary;
        }

        if (req.body.regenerate) {
            regenerate = true;
        }

        const invite = await database.createInvite(req.params.guildid, req.params.channelid, sender.id, temporary, max_uses, max_age, xkcdpass, regenerate);

        if (invite == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        return res.status(200).json(invite);
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.use("/:channelid/messages", globalUtils.channelMiddleware, messages);

router.put("/:channelid/permissions/:id", globalUtils.channelMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_ROLES"), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (!sender || !sender.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }
    
        let id = req.params.id;
        let channel_id = req.params.channelid;
        let type = req.body.type;

        if (!type) {
            type = 'role';
        }

        if (type != 'member' && type != 'role') {
            return res.status(404).json({
                code: 404,
                message: "Unknown Type"
            });
        }
        
        let channel = req.channel;

        if (channel == null || !channel.guild_id) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        let channel_overwrites: Permission_Overwrite[] = await database.getChannelPermissionOverwrites(channel.id);
        let overwrites: Permission_Overwrite[] = channel_overwrites;
        let overwriteIndex = channel_overwrites.findIndex(x => x.id == id);
        let allow = 0;
        let deny = 0;

        /*
        let permissionValuesObject = {
            CREATE_INSTANT_INVITE: permissions.CREATE_INSTANT_INVITE,
            KICK_MEMBERS: permissions.KICK_MEMBERS,
            BAN_MEMBERS: permissions.BAN_MEMBERS,
            MANAGE_ROLES: permissions.MANAGE_ROLES,
            MANAGE_CHANNELS: permissions.MANAGE_CHANNELS,
            MANAGE_GUILD: permissions.MANAGE_SERVER,
            READ_MESSAGES: permissions.READ_MESSAGES,
            SEND_MESSAGES: permissions.SEND_MESSAGES,
            SEND_TTS_MESSAGES: permissions.SEND_TTS_MESSAGES,
            MANAGE_MESSAGES: permissions.MANAGE_MESSAGES,
            EMBED_LINKS: permissions.EMBED_LINKS,
            ATTACH_FILES: permissions.ATTACH_FILES,
            READ_MESSAGE_HISTORY: permissions.READ_MESSAGE_HISTORY,
            MENTION_EVERYONE: permissions.MENTION_EVERYONE,
            CONNECT: permissions.CONNECT,
            SPEAK: permissions.SPEAK,
            MUTE_MEMBERS: permissions.MUTE_MEMBERS,
            DEAFEN_MEMBERS: permissions.DEAFEN_MEMBERS,
            MOVE_MEMBERS: permissions.MOVE_MEMBERS,
            USE_VAD: permissions.USE_VOICE_ACTIVITY,
        };
        */
        let permissionValuesObject = {
            CREATE_INSTANT_INVITE: permissions.CREATE_INSTANT_INVITE,
            KICK_MEMBERS: permissions.KICK_MEMBERS,
            BAN_MEMBERS: permissions.BAN_MEMBERS,
            MANAGE_ROLES: permissions.MANAGE_ROLES,
            MANAGE_CHANNELS: permissions.MANAGE_CHANNELS,
            MANAGE_GUILD: permissions.MANAGE_SERVER,
            READ_MESSAGES: permissions.READ_MESSAGES,
            SEND_MESSAGES: permissions.SEND_MESSAGES,
            SEND_TTS_MESSAGES: permissions.SEND_TTS_MESSAGES,
            MANAGE_MESSAGES: permissions.MANAGE_MESSAGES,
            EMBED_LINKS: permissions.EMBED_LINKS,
            ATTACH_FILES: permissions.ATTACH_FILES,
            READ_MESSAGE_HISTORY: permissions.READ_MESSAGE_HISTORY,
            MENTION_EVERYONE: permissions.MENTION_EVERYONE,
            CONNECT: permissions.CONNECT,
            SPEAK: permissions.SPEAK,
            MUTE_MEMBERS: permissions.MUTE_MEMBERS,
            DEAFEN_MEMBERS: permissions.DEAFEN_MEMBERS,
            MOVE_MEMBERS: permissions.MOVE_MEMBERS,
            USE_VAD: permissions.USE_VOICE_ACTIVITY,
        };
        let permissionKeys = Object.keys(permissionValuesObject);
        let keys = permissionKeys.map((key) => permissionValuesObject[key]);

        for (let permValue of keys) {
            if (!!(req.body.allow & permValue)) {
                allow |= permValue;
            }

            if (!!(req.body.deny & permValue)) {
                deny |= permValue;
            }
        }

        if (overwriteIndex === -1) {
            overwrites.push({
                id: id,
                allow: allow,
                deny: deny,
                type: type
            })
        } else {
            overwrites[overwriteIndex] = {
                id: id,
                allow: allow,
                deny: deny,
                type: type
            };
        }

        if (type == 'member') {
            let member = await database.getGuildMemberById(channel.guild_id, id);

            if (member == null) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Member"
                });
            }
        } else {
            let role = await database.getRoleById(id);

            if (role == null) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Role"
                });
            }
        }

        await database.updateChannelPermissionOverwrites(channel.id, overwrites);

        channel = await database.getChannelById(channel_id);

        if (!channel?.guild_id) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventToAllPerms(channel?.guild_id, channel?.id, "MANAGE_ROLES", {
            op: 0,
            t: "CHANNEL_UPDATE",
            s: null,
            d: {
                type: channel?.type,
                id: channel?.id,
                guild_id: channel?.guild_id,
                topic: channel?.topic,
                last_message_id: channel?.last_message_id,
                name: channel?.name,
                permission_overwrites: channel?.permission_overwrites
            }
        });

        return res.status(204).send();
    } catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:channelid/permissions/:id", globalUtils.channelMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_ROLES"), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (!sender || !sender.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let id = req.params.id;
        let channel_id = req.params.channelid;
        
        let channel = req.channel;

        if (channel == null || !channel.guild_id) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        let channel_overwrites: Permission_Overwrite[] = await database.getChannelPermissionOverwrites(channel.id);
        let overwriteIndex = channel_overwrites.findIndex(x => x.id == id);

        if (overwriteIndex === -1) {
            await gateway.dispatchEventToAllPerms(channel?.guild_id, channel?.id, "MANAGE_ROLES", {
                op: 0,
                t: "CHANNEL_UPDATE",
                s: null,
                d: {
                    type: channel?.type,
                    id: channel?.id,
                    guild_id: channel?.guild_id,
                    topic: channel?.topic,
                    last_message_id: channel?.last_message_id,
                    name: channel?.name,
                    permission_overwrites: channel?.permission_overwrites
                }
            });

            return res.status(204).send();
        }

        await database.deleteChannelPermissionOverwrite(channel_id, channel_overwrites[overwriteIndex]);

        channel = await database.getChannelById(channel_id);

        if (!channel?.guild_id) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventToAllPerms(channel?.guild_id, channel?.id, "MANAGE_ROLES", {
            op: 0,
            t: "CHANNEL_UPDATE",
            s: null,
            d: {
                type: channel?.type,
                id: channel?.id,
                guild_id: channel?.guild_id,
                topic: channel?.topic,
                last_message_id: channel?.last_message_id,
                name: channel?.name,
                permission_overwrites: channel?.permission_overwrites
            }
        });

        return res.status(204).send();
    } catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:channelid", globalUtils.channelMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_CHANNELS"), globalUtils.rateLimitMiddleware(5, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (!sender || !sender.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let channel = req.channel;

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        if (!channel.guild_id) {
            let alreadyClosed = await database.isDMClosed(channel.id);

            if (!alreadyClosed) {
                let tryClose = await database.closeDMChannel(channel.id);

                if (!tryClose) {
                    return res.status(500).json({
                        code: 500,
                        message: "Internal Server Error"
                    });
                }
            }

            await gateway.dispatchEventTo(sender.token, {
                op: 0,
                t: "CHANNEL_DELETE",
                s: null,
                d: {
                    id: channel.id,
                    guild_id: null
                }
            });
            
            let recipient = await database.getAccountByUserId(channel.recipient.id);

            if (recipient != null && recipient.token) {
                await gateway.dispatchEventTo(recipient.token, {
                    op: 0,
                    t: "CHANNEL_DELETE",
                    s: null,
                    d: {
                        id: channel.id,
                        guild_id: null
                    }
                });
            }

            return res.status(204).send();
        } else {
            if (req.params.channelid == req.params.guildid) {
                return res.status(403).json({
                    code: 403,
                    message: "Missing Permissions"
                });
            }

            await gateway.dispatchEventInChannel(channel.id, {
                op: 0,
                t: "CHANNEL_DELETE",
                s: null,
                d: {
                    id: channel.id,
                    guild_id: channel.guild_id
                }
            });
    
            if (!await database.deleteChannel(channel.id)) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
    
            return res.status(204).send();
        }
    } catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;