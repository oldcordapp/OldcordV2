import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';

const router = express.Router({ mergeParams: true });

router.get("/regions", async (req: any, res: any) => {
    try {
        const sender = req.account;

        if (sender == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        return res.status(200).json(["sydney"]);
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;