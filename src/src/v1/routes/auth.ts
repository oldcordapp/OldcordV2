import * as express from 'express';
import { Request, Response } from 'express';
import database from '../utils/database';
import StandardError from '../interfaces/errors/standarderror';
import LoginResponse from '../interfaces/responses/loginresponse';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';
import config from '../utils/config';
import gateway from '../gateway';

const router = express.Router();

router.post("/register", globalUtils.instanceMiddleware("NO_REGISTRATION"), globalUtils.rateLimitMiddleware(5, 1000 * 60 * 60), async (req: any, res: any) => {
  try {
    if (!req.body.email) {
      //return res.status(400).json({
       // code: 400,
       // email: "This field is required",
      //});

      req.body.email = `june_12_2015_app${globalUtils.generateString(10)}@oldcordapp.com`
    }

    if (!req.body.username) {
      return res.status(400).json({
        code: 400,
        username: "This field is required",
      });
    }

    if (!req.body.password) {
      //return res.status(400).json({
       // code: 400,
       // password: "This field is required",
      //});
      req.body.password = globalUtils.generateString(20);
    }

    if (req.body.username.length < 2 || req.body.username.length > 32) {
      return res.status(400).json({
        code: 400,
        username: "Must be between 2 and 32 characters",
      });
    }

    const registrationAttempt = await database.createAccount(req.body.username, req.body.email, req.body.password);

    if ('reason' in registrationAttempt) {
      const error: StandardError = registrationAttempt as StandardError;

      return res.status(400).json({
        code: 400,
        email: error.reason
      });
    } else {
      const newaccount: LoginResponse = registrationAttempt as LoginResponse;
      const autoJoinGuild = config.instance_flags.filter(x => x.toLowerCase().includes("autojoin:"));

      if (autoJoinGuild.length > 0) {
        let guildId = autoJoinGuild[0].split(':')[1];

        let guild = await database.getGuildById(guildId);

        if (guild != null) {
          let account = await database.getAccountByToken(newaccount.token);

          if (account == null) {
            return res.status(500).json({
              code: 500,
              message: "Internal Server Error"
            });
          }
          
          await database.joinGuild(account.id, guildId);

          await gateway.dispatchEventTo(newaccount.token, {
            op: 0,
            t: "GUILD_CREATE",
            s: null,
            d: guild
          });
      
          await gateway.dispatchEventInGuild(guildId, {
            op: 0,
            t: "GUILD_MEMBER_ADD",
            s: null,
            d: {
              roles: [],
              user: {
                username: account.username,
                discriminator: account.discriminator,
                id: account.id,
                avatar: account.avatar
              },
              guild_id: guildId
            }
          });
      
          await gateway.dispatchEventInGuild(guildId, {
            op: 0,
            t: "PRESENCE_UPDATE",
            s: null,
            d: {
              game_id: null,
              status: "online",
              user: {
                username: account.username,
                discriminator: account.discriminator,
                id: account.id,
                avatar: account.avatar
              },
              guild_id: guildId
            }
          });
        }
      }

      return res.status(200).json({
        token: newaccount.token,
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

router.post("/login", globalUtils.rateLimitMiddleware(50, 1000 * 60 * 60), async (req: any, res: any) => {
  if (!req.body.email) {
    return res.status(400).json({
      code: 400,
      email: "This field is required",
    });
  }

  if (!req.body.password) {
    return res.status(400).json({
      code: 400,
      password: "This field is required",
    });
  }

  const loginAttempt = await database.checkAccount(req.body.email, req.body.password);

  if ('reason' in loginAttempt) {
    const error: StandardError = loginAttempt as StandardError;

    return res.status(400).json({
      code: 400,
      email: error.reason,
      password: error.reason
    });
  } else {
    const account: LoginResponse = loginAttempt as LoginResponse;

    return res.status(200).json({
      token: account.token,
    });
  }
});

router.post("/logout", (req: any, res: any) => {
  return res.status(204).send();
});

router.post("/forgot", (req: any, res: any) => {
  return res.status(204).send();
});

export default router;