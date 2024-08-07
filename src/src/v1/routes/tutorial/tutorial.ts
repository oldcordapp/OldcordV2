import * as express from 'express';
import { Request, Response } from 'express';
import { logText } from '../../utils/logger';
import database from '../../utils/database';

const router = express.Router();

router.get("/", async (req: any, res: any) => {
  try {
    if (!req.account) {
        return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
          });
    }
    
    const tutorial = await database.getTutorial(req.account.id);

    if (tutorial == null) {
        return res.status(200).json({
            indicators_suppressed: false,
            indicators_confirmed: []
        })
    }

    return res.status(200).json(tutorial);
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

router.post("/indicators/suppress", async (req: any, res: any) => {
    try {
        if (!req.account) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
              });
        }

        const tutorial = await database.getTutorial(req.account.id);

        if (tutorial == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (tutorial.indicators_suppressed) {
            return res.status(200).json(tutorial);
        }

        let confirmed = tutorial.indicators_confirmed;

        let attempt = await database.updateTutorial(req.account.id, true, confirmed);

        if (!attempt) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        return res.status(200).json({
            indicators_suppressed: tutorial.indicators_suppressed,
            indicators_confirmed: confirmed
        });
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.put("/indicators/:indicator", async (req: any, res: any) => {
    try {
        if (!req.account) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
              });
        }

        const tutorial = await database.getTutorial(req.account.id);

        if (tutorial == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (tutorial.indicators_suppressed || tutorial.indicators_confirmed.includes(req.params.indicator.toLowerCase())) {
            return res.status(200).json(tutorial);
        }

        let validIndicators: string[] = [
            "direct-messages",
            "voice-conversations",
            "organize-by-topic",
            "writing-messages",
            "instant-invite",
            "server-settings",
            "create-more-servers",
            "friends-list",
            "whos-online",
            "create-first-server"
        ]

        if (!validIndicators.includes(req.params.indicator.toLowerCase())) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Indicator"
            }); 
        }

        let confirmed = tutorial.indicators_confirmed;

        confirmed.push(req.params.indicator.toLowerCase());

        let attempt = await database.updateTutorial(req.account.id, tutorial.indicators_suppressed, confirmed);

        if (!attempt) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        return res.status(200).json({
            indicators_suppressed: tutorial.indicators_suppressed,
            indicators_confirmed: confirmed
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