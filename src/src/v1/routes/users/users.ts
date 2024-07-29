import * as express from 'express';
import * as fs from 'fs';
import { Request, Response } from 'express';
import database from '../../utils/database';
import { logText } from '../../utils/logger';
import me from "./me";
import gateway from '../../gateway';
import Channel from '../../interfaces/guild/channel';
import DMChannel from '../../interfaces/dmchannel';
import * as path from 'path';
import Guild from '../../interfaces/guild';
import Member from '../../interfaces/guild/member';
import globalUtils from '../../utils/global';

const router = express.Router();

router.param('userid', async (req: any, res: any, next: any, userid: any) => {
    req.user = await database.getAccountByUserId(userid);
    next();
});

router.use("/@me", me);

router.get("/:userid/avatars/:file", async (req: any, res: any) => {
    try {
        if (req.user == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown User"
            });
        }

        const filePath = path.join(process.cwd(), 'user_assets', 'avatars', req.params.userid, req.params.file);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("File not found");
        }

        return res.status(200).sendFile(filePath);
    }
    catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
        });
    }
});

router.post("/:userid/channels", globalUtils.rateLimitMiddleware(100, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const account = req.account;

        if (!account) {
          return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
          });
        }

        const user = await database.getAccountByUserId(req.body.recipient_id);

        if (user == null || !user.token) {
            return res.status(404).json({
                code: 404,
                message: "Unknown User"
            });
        }

        if (user.id == account.id) {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }

        const dm_channels: DMChannel[] = await database.getDMChannels(account.id);
        const openedAlready = dm_channels.find(x => x.receiver_of_channel_id == user.id || x.author_of_channel_id == user.id);

        if (openedAlready) {
            if (openedAlready.is_closed) {
                await database.openDMChannel(openedAlready.id);

                gateway.dispatchEventTo(account.token, {
                    op: 0,
                    t: "CHANNEL_CREATE",
                    s: null,
                    d: {
                        id: openedAlready.id,
                        name: "", //dm channels have no name lol
                        topic: "",
                        position: 0,
                        recipient: {
                            id: user.id
                        },
                        type: "text",
                        guild_id: null,
                        is_private: true,
                        permission_overwrites: []
                    }
                });
        
                gateway.dispatchEventTo(user.token, {
                    op: 0,
                    t: "CHANNEL_CREATE",
                    s: null,
                    d: {
                        id: openedAlready.id,
                        name: "", //dm channels have no name lol
                        topic: "",
                        position: 0,
                        recipient: {
                            id: account.id
                        },
                        type: "text",
                        guild_id: null,
                        is_private: true,
                        permission_overwrites: []
                    }
                });
            }

            return res.status(200).json({
                id: openedAlready.id,
                name: "", //dm channels have no name lol
                topic: "",
                position: 0,
                recipient: {
                    id: user.id
                },
                type: "text",
                guild_id: null,
                is_private: true,
                permission_overwrites: []
            });
        }

        const theirguilds: Guild[] = await database.getUsersGuilds(user.id);
        const myguilds: Guild[] = await database.getUsersGuilds(account.id);

        let share: boolean = false;

        for (var their of theirguilds) {
            if (their.members != null && their.members.length > 0) {
                const theirmembers: Member[] = their.members;

                if (theirmembers.filter(x => x.id == account.id).length > 0) {
                    share = true;
                }
            }
        }

        for (var mine of myguilds) {
            if (mine.members != null && mine.members.length > 0) {
                const mymembers: Member[] = mine.members;

                if (mymembers.filter(x => x.id == user.id).length > 0) {
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

        const channel = await database.createDMChannel(account.id, user.id);

        if (channel == null || !user.token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        gateway.dispatchEventTo(account.token, {
            op: 0,
            t: "CHANNEL_CREATE",
            s: null,
            d: {
                id: channel.id,
                name: "", //dm channels have no name lol
                topic: "",
                position: 0,
                recipient: {
                    id: user.id
                },
                type: "text",
                guild_id: null,
                is_private: true,
                permission_overwrites: []
            }
        });

        gateway.dispatchEventTo(user.token, {
            op: 0,
            t: "CHANNEL_CREATE",
            s: null,
            d: {
                id: channel.id,
                name: "", //dm channels have no name lol
                topic: "",
                position: 0,
                recipient: {
                    id: account.id
                },
                type: "text",
                guild_id: null,
                is_private: true,
                permission_overwrites: []
            }
        });

        return res.status(200).json({
            id: channel.id,
            name: "", //dm channels have no name lol
            topic: "",
            position: 0,
            recipient: {
                id: user.id
            },
            type: "text",
            guild_id: null,
            is_private: true,
            permission_overwrites: []
        });
    }
    catch(error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
        });
    }
});

export default router;