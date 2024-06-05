import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import globalUtils from '../utils/global';

const router = express.Router({ mergeParams: true });

router.get("/:code", async (req: Request, res: Response) => {
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

    const invite = await database.getInvite(req.params.code);

    if (invite == null) {
      return res.status(404).json({
        code: 404,
        message: "Unknown Invite"
      });
    }

    delete invite.temporary;
    delete invite.revoked;
    delete invite.uses;
    delete invite.max_uses;
    delete invite.max_age;
    delete invite.xkcdpass;

    return res.status(200).json(invite);
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

router.delete("/:code", async (req: Request, res: Response) => {
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

    const invite = await database.getInvite(req.params.code);

    if (invite == null) {
      return res.status(404).json({
        code: 404,
        message: "Unknown Invite"
      });
    }

    const channel = await database.getChannelById(invite.channel.id);

    if (channel == null) {
      return res.status(404).json({
        code: 404,
        message: "Unknown Channel"
      });
    }

    let pCheck = await globalUtils.hasChannelPermissionTo(channel.id, sender.id, "MANAGE_CHANNEL");

    if (!pCheck) {
      return res.status(403).json({
        code: 403,
        message: "Missing Permissions"
      });
    }

    const tryDelete = await database.deleteInvite(req.params.code);

    if (!tryDelete) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    return res.status(204).send();
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

router.post("/:code", globalUtils.instanceMiddleware("NO_INVITE_USE"), async (req: Request, res: Response) => {
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

    const invite = await database.getInvite(req.params.code);

    if (invite == null) {
      return res.status(404).json({
        code: 404,
        message: "Unknown Invite"
      });
    }

    const guild = await database.getGuildById(invite.guild.id);

    if (guild == null) {
      return res.status(404).json({
        code: 404,
        message: "Unknown Invite"
      });
    }

    delete invite.temporary;
    delete invite.revoked;
    delete invite.uses;
    delete invite.max_uses;
    delete invite.max_age;
    delete invite.xkcdpass;

    const client = await gateway.clients.filter(x => x.token == token)[0];

    if (client == null) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    const joinAttempt = await database.useInvite(req.params.code, sender.id);

    if (!joinAttempt) {
      return res.status(404).json({
        code: 10006,
        message: "Invalid Invite"
      });
    }

    client.sequence++;

    await gateway.dispatchEventTo(token, {
      op: 0,
      t: "GUILD_CREATE",
      s: client.sequence,
      d: guild
    });

    await gateway.dispatchEventInGuild(invite.guild.id, {
      op: 0,
      t: "GUILD_MEMBER_ADD",
      s: null,
      d: {
        roles: [],
        user: {
          username: sender.username,
          discriminator: sender.discriminator,
          id: sender.id,
          avatar: sender.avatar
        },
        guild_id: invite.guild.id
      }
    });

    await gateway.dispatchEventInGuild(invite.guild.id, {
      op: 0,
      t: "PRESENCE_UPDATE",
      s: null,
      d: {
        game: null,
        status: "online",
        user: {
          username: sender.username,
          discriminator: sender.discriminator,
          id: sender.id,
          avatar: sender.avatar
        },
        guild_id: invite.guild.id
      }
    });
    return res.status(200).send(invite);
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

export default router;