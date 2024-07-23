import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';
import Ban from '../interfaces/guild/ban';
import Message from '../interfaces/guild/message';

const router = express.Router({ mergeParams: true });

router.get("/", globalUtils.guildPermissionsMiddleware("BAN_MEMBERS"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const sender = await database.getAccountByToken(token);

        if (sender == null) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const bans = await database.getGuildBans(req.params.guildid);

        return res.status(200).json(bans);
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.put("/:memberid", globalUtils.guildPermissionsMiddleware("BAN_MEMBERS"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const sender = await database.getAccountByToken(token);

        if (sender == null) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        if (sender.id == req.params.memberid) {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }

        const member = await database.getGuildMemberById(req.params.guildid, req.params.memberid);

        if (member == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Member"
            });
        }

        const client = await gateway.clients.filter(x => x.user.id == member.id)[0];
        const attempt = await database.leaveGuild(member.id, req.params.guildid);
        const tryBan = await database.banMember(req.params.guildid, member.id);

        if (!attempt || !tryBan) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (client != null) {
            client.sequence++;

            await gateway.dispatchEventTo(client.token, {
                op: 0,
                t: "GUILD_DELETE",
                s: client.sequence,
                d: {
                    id: req.params.guildid
                }
            });
        }

        await gateway.dispatchEventInGuild(req.params.guildid, {
            op: 0,
            t: "GUILD_MEMBER_REMOVE",
            s: null,
            d: {
              user: {
                username: member.user.username,
                discriminator: member.user.discriminator,
                id: member.user.id,
                avatar: member.user.avatar
              },
              roles: [],
              guild_id: req.params.guildid
            }
        });

        await gateway.dispatchEventTo(token, {
            op: 0,
            t: "GUILD_BAN_ADD",
            s: null,
            d: {
                guild_id: req.params.guildid,
                user: {
                    username: member.user.username,
                    avatar: member.user.avatar,
                    id: member.user.id,
                    discriminator: member.user.discriminator
                },
                roles: []
            }
        });

        if (req.query['delete-message-days']) {
            let deleteMessageDays = parseInt(req.query['delete-message-days'] as string);

            if (deleteMessageDays > 7) {
                deleteMessageDays = 7;
            }

            if (deleteMessageDays > 0) {
                let messages: Message[] = await database.getUsersMessagesInGuild(req.params.guildid, member.user.id);

                const deletemessagedaysDate = new Date();
                
                deletemessagedaysDate.setDate(deletemessagedaysDate.getDate() - deleteMessageDays);

                messages = messages.filter(message => {
                    const messageTimestamp = new Date(message.timestamp);
                    
                    return messageTimestamp >= deletemessagedaysDate;
                });

                if (messages.length > 0) {
                    for(var message of messages) {
                        let tryDelete = await database.deleteMessage(message.id);

                        if (tryDelete) {
                            await gateway.dispatchEventInChannel(message.channel_id, {
                                op: 0,
                                t: "MESSAGE_DELETE",
                                s: null,
                                d: {
                                    id: message.id,
                                    guild_id: req.params.guildid,
                                    channel_id: message.channel_id
                                }
                            })
                        }
                    }
                }
            }
        }
        

        return res.status(204).send();
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:memberid", globalUtils.guildPermissionsMiddleware("BAN_MEMBERS"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const sender = await database.getAccountByToken(token);

        if (sender == null) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        if (sender.id == req.params.memberid) {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }

        const bans: Ban[] = await database.getGuildBans(req.params.guildid);

        const ban = bans.find(x => x.user.id == req.params.memberid);

        if (!ban) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Ban"
            });
        }

        const attempt = await database.unbanMember(req.params.guildid, req.params.memberid);

        if (!attempt) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventTo(token, {
            op: 0,
            t: "GUILD_BAN_REMOVE",
            s: null,
            d: {
                guild_id: req.params.guildid,
                user: ban.user,
                roles: []
            }
        });

        return res.status(204).send();
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;