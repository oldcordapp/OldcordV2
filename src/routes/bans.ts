import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';
import Ban from '../interfaces/guild/ban';

const router = express.Router({ mergeParams: true });

router.get("/", globalUtils.guildPermissionsMiddleware("BAN_MEMBERS"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const sender = await database.getAccountByToken(token);

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
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
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const sender = await database.getAccountByToken(token);

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
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

        if (client == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        client.sequence++;

        const attempt = await database.leaveGuild(member.id, req.params.guildid);
        const tryBan = await database.banMember(req.params.guildid, member.id);

        if (!attempt || !tryBan) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventTo(client.token, {
            op: 0,
            t: "GUILD_DELETE",
            s: client.sequence,
            d: {
                id: req.params.guildid
            }
        });

        await gateway.dispatchEventInGuild(req.params.guildid, {
            op: 0,
            t: "GUILD_MEMBER_REMOVE",
            s: null,
            d: {
              user: member.user,
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
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const sender = await database.getAccountByToken(token);

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
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
                message: "Uknown Ban"
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