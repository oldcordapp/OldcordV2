import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';
import Role from '../interfaces/guild/role';

const router = express.Router({ mergeParams: true });

router.param('memberid', async (req: any, res: any, next: any, memberid: any) => {
    req.member = await database.getGuildMemberById(req.params.guildid, memberid);
    next();
});

router.delete("/:memberid", globalUtils.guildPermissionsMiddleware("KICK_MEMBERS"), globalUtils.rateLimitMiddleware(200, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const member = req.member;

        if (member == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Member"
            });
        }

        const client = gateway.clients.filter(x => x.user.id == member.id)[0];

        const attempt = await database.leaveGuild(member.id, req.params.guildid);

        if (!attempt) {
            console.log("failed to kick the user" + req.params.userid);

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
                roles: [],
                user: {
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                    id: member.user.id,
                    avatar: member.user.avatar
                },
                guild_id: req.params.guildid
            }
        });

        return res.status(204).send();
    } catch (error: any) {
        console.log(error.toString());
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.patch("/:memberid", globalUtils.guildPermissionsMiddleware("MANAGE_ROLES"), globalUtils.rateLimitMiddleware(200, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const member = req.member;

        if (member == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Member"
            });
        }

        const roles: string[] = [];

        if (req.body.roles.length == 0) {
            const tryClearRoles = await database.clearRoles(req.params.guildid, member.id);

            if (!tryClearRoles) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        } else {
            for(var role of req.body.roles) {
                if (JSON.stringify(role).includes("id")) {
                    let RoleObj: Role = role;

                    roles.push(RoleObj.id);
                } else {
                    roles.push(role);
                }
            }

            if (!roles.includes(req.params.guildid)) {
                roles.push(req.params.guildid);
            }

            for(var role_id of roles) {
                const attempt = await database.addRole(req.params.guildid, role_id, member.id);
    
                if (!attempt) {
                    return res.status(500).json({
                        code: 500,
                        message: "Internal Server Error"
                    });
                }
            }
        }

        await gateway.dispatchEventInGuild(req.params.guildid, {
            op: 0,
            t: "GUILD_MEMBER_UPDATE",
            s: null,
            d: {
                roles: member.roles,
                user: member.user,
                guild_id: req.params.guildid
            }
        });

        return res.status(200).json({
            user: member.user,
            guild_id: req.params.guildid,
            roles: roles,
            deaf: false,
            mute: false
        });
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;