import * as express from 'express';
import * as fs from 'fs';
import { Request, Response } from 'express';
import database from '../../utils/database';
import { logText } from '../../utils/logger';
import me from "./me";
import gateway from '../../gateway';
import Channel from '../../interfaces/guild/channel';
import * as path from 'path';

const router = express.Router();

router.use("/@me", me);

router.get("/:userid/avatars/:file", async (req: Request, res: Response) => {
    try {
        const user = await database.getAccountByUserId(req.params.userid);

        if (user == null) {
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

router.post("/:userid/channels", async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];

        if (!token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const account = await database.getAccountByToken(token);

        if (account == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const user = await database.getAccountByUserId(req.body.recipient_id);

        if (user == null) {
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

        const theirchannels: Channel[] = await database.getDMChannels(user.id);
        const mychannels: Channel[] = await database.getDMChannels(account.id);

        let already_id: string = '';

        for (const their of theirchannels) {
            for (const mine of mychannels) {
                if (their.id === mine.id) {
                    already_id = their.id;
                    break;
                }
            }
        }

        if (already_id != '') {
            const channel = mychannels.find((x) => x.id === already_id);

            return res.status(200).json(channel);
        } else {
            const channel = await database.createDMChannel(account.id, user.id);

            if (channel == null || !user.token) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
    
            await gateway.dispatchInDM(account.id, user.id, {
                op: 0,
                t: "CHANNEL_CREATE",
                s: null,
                d: channel
            });
    
            return res.status(200).json(channel);
        }
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