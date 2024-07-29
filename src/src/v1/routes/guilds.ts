import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import roles from './roles';
import members from './members';
import globalUtils from '../utils/global';
import Channel from '../interfaces/guild/channel';
import bans from './bans';

const router = express.Router();

router.param('guildid', async (req: any, res: any, next: any, guildid: any) => {
    req.guild = await database.getGuildById(guildid);
    next();
});

router.post("/", globalUtils.instanceMiddleware("NO_GUILD_CREATION"), globalUtils.rateLimitMiddleware(50, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        if (!req.body.name || req.body.name == "") {
            return res.status(400).json({
                name: "This field is required."
            })
        }

        if (req.body.name.length < 2 || req.body.name.length > 30) {
            return res.status(400).json({
                name: "Must be between 2 and 30 in length."
            })
        }

        const creator = req.account;

        if (!creator || !creator.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const guild = await database.createGuild(creator.id, req.body.icon, req.body.name, req.body.region);

        if (guild == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        } else {
            const client = gateway.clients.filter(x => x.token == creator.token)[0];

            if (client == null) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            client.sequence++;

            await gateway.dispatchEventTo(creator.token, {
                op: 0,
                t: "GUILD_CREATE",
                s: client.sequence,
                d: guild
            });

            return res.status(200).json(guild);
        }
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:guildid", globalUtils.guildMiddleware, globalUtils.rateLimitMiddleware(50, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const user = req.account;

        if (!user || !user.token) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const guild = req.guild;

        if (!guild) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Guild"
            });
        }

        if (guild.owner_id == user.id) {
            await gateway.dispatchEventInGuild(guild.id, {
                op: 0,
                t: "GUILD_DELETE",
                s: null,
                d: {
                    id: req.params.guildid
                }
            });
            
            const del = await database.deleteGuild(guild.id);

            if (!del) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            return res.status(204).send();
        } else {
            const client = gateway.clients.filter(x => x.token == user.token)[0];

            if (client == null) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
    
            client.sequence++;

            const leave = await database.leaveGuild(user.id, guild.id);

            if (!leave) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            await gateway.dispatchEventTo(user.token, {
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
                    type: "leave",
                    roles: [],
                    user: {
                        username: user.username,
                        discriminator: user.discriminator,
                        id: user.id,
                        avatar: user.avatar
                    },
                  guild_id: req.params.guildid
                }
            });

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

router.patch("/:guildid", globalUtils.guildMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_GUILD"), globalUtils.rateLimitMiddleware(100, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        if (req.body.name.length < 2 || req.body.name.length > 30) {
            return res.status(400).json({
                name: "Must be between 2 and 30 in length."
            })
        }

        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let what = req.guild;

        if (what == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            }); 
        }

        const update = await database.updateGuild(req.params.guildid, req.body.afk_channel_id, req.body.afk_timeout, req.body.icon, req.body.name, req.body.region);

        if (!update) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        what = await database.getGuildById(req.params.guildid);

        if (what == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            }); 
        }

        await gateway.dispatchEventInGuild(req.params.guildid, {
            op: 0,
            t: "GUILD_UPDATE",
            s: null,
            d: what
        });

        return res.status(200).json(what);
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.get("/:guildid/prune", async (req: any, res: any) => {
    return res.status(200).json([]); //literally cant be fucked rn
});

router.post("/:guildid/prune", async (req: any, res: any) => {
    return res.status(200).json({
        yay: "u did it u pruned the members"
    })
});

router.get("/:guildid/embed", globalUtils.guildMiddleware, async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const widget = await database.getGuildWidget(req.params.guildid);

        if (widget == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }
        
        return res.status(200).json(widget);
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.patch("/:guildid/embed", globalUtils.guildMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_GUILD"), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const update = await database.updateGuildWidget(req.params.guildid, req.body.channel_id, req.body.enabled);

        if (!update) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const widget = await database.getGuildWidget(req.params.guildid);

        if (widget == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            }); 
        }

        return res.status(200).json(widget);
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.get("/:guildid/invites", globalUtils.guildMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_GUILD"), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const invites = await database.getGuildInvites(req.params.guildid);

        return res.status(200).json(invites);
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.post("/:guildid/channels", globalUtils.guildMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_CHANNELS"), globalUtils.rateLimitMiddleware(100, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const member = await database.getGuildMemberById(req.params.guildid, sender.id);

        if (member == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Member"
            });
        }

        const channel = await database.createChannel(req.params.guildid, req.body.name, req.body.type);

        if (channel == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventInGuild(req.params.guildid, {
            op: 0,
            t: "CHANNEL_CREATE",
            s: null,
            d: channel
        });

        return res.status(200).json(channel);
    } catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.patch("/:guildid/channels", globalUtils.guildMiddleware, globalUtils.guildPermissionsMiddleware("MANAGE_CHANNELS"), globalUtils.rateLimitMiddleware(100, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let ret: Channel[] = [];

        for(var shit of req.body) {
            var channel_id = shit.id;
            var position = shit.position;

            const channel = await database.getChannelById(channel_id)

            if (channel == null) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            channel.position = position;

            const outcome = await database.updateChannel(channel_id, channel);

            if (!outcome) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            ret.push(channel);

            await gateway.dispatchEventInChannel(channel_id, {
                op: 0,
                t: "CHANNEL_UPDATE",
                s: null,
                d: channel
            });
        }

        return res.status(200).json(ret);
    } catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.use("/:guildid/roles", roles);
router.use("/:guildid/members", members);
router.use("/:guildid/bans", bans);

export default router;