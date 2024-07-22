import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';

const router = express.Router({ mergeParams: true });

router.patch("/:roleid", globalUtils.guildPermissionsMiddleware("MANAGE_ROLES"), async (req: Request, res: Response) => {
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

        let roles = await database.getGuildRoles(req.params.guildid);

        if (roles.length == 0) {
            return res.status(400).json({
                code: 400,
                message: "Unknown Role"
            });
        }

        let role = await database.getRoleById(req.params.roleid);

        if (role == null) {
            return res.status(400).json({
                code: 400,
                message: "Unknown Role"
            });
        }

        if (req.body.name != "@everyone" && req.params.roleid == req.params.guildid) {
            return res.status(403).json({
                code: 403,
                message: "Cannot modify name of everyone role."
            });
        }

        const attempt = await database.updateRole(req.params.roleid, req.body.name, req.body.permissions, req.body.position ? req.body.position : null);

        if (attempt) {
            role = await database.getRoleById(req.params.roleid);

            await gateway.dispatchEventToAllPerms(req.params.guildid, null, "MANAGE_ROLES", {
                t: "GUILD_ROLE_UPDATE",
                op: 0,
                s: null,
                d: {
                    guild_id: req.params.guildid,
                    role: role
                }
            });

            return res.status(200).json(role);
        } else {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:roleid", globalUtils.guildPermissionsMiddleware("MANAGE_ROLES"), async (req: Request, res: Response) => {
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

        let role = await database.getRoleById(req.params.roleid);

        if (role == null) {
            return res.status(400).json({
                code: 400,
                message: "Unknown Role"
            });
        }

        const attempt = await database.deleteRole(req.params.roleid);

        if (!attempt) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventInGuild(req.params.guildid, {
            t: "GUILD_ROLE_DELETE",
            op: 0,
            s: null,
            d: {
                guild_id: req.params.guildid,
                role_id: req.params.roleid
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

router.post("/", globalUtils.guildPermissionsMiddleware("MANAGE_ROLES"), async (req: Request, res: Response) => {
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
        
        const role = await database.createRole(req.params.guildid, "new role", 0, 1);

        if (role == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventToAllPerms(req.params.guildid, null, "MANAGE_ROLES", {
            t: "GUILD_ROLE_CREATE",
            op: 0,
            s: null,
            d: {
                guild_id: req.params.guildid,
                role: role
            }
        });

        return res.status(200).json(role);
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;