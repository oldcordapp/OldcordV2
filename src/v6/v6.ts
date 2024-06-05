import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';

const router = express.Router({ mergeParams: true });

//router.use("/auth", auth);

router.get("/", async (req: Request, res: Response) => {
    return res.status(200).send("OK");
});

export default router;