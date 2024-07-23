import * as express from 'express';
import { Request, Response } from 'express';
import database from '../../utils/database';
import { logText } from '../../utils/logger';
import gateway from '../../gateway';

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
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

    delete account.settings;
    delete account.token;
    delete account.password;
    
    return res.status(200).json(account);
  }
  catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

router.get("/settings", async (req: Request, res: Response) => {
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

    return res.status(200).json({
      inline_embed_media: account.settings?.includes("INLINE_EMBED_MEDIA:1"),
      inline_attachment_media: account.settings?.includes("INLINE_ATTACHMENT_MEDIA:1"),
      render_embeds: account.settings?.includes("RENDER_EMBEDS:1"),
      enable_tts_command: account.settings?.includes("ENABLE_TTS_COMMAND:1"),
      theme: account.settings?.includes("THEME:DARK") ? "dark" : "light",
    })
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

router.patch("/", async (req: Request, res: Response) => {
  try {
    const token = req.headers['authorization'];

    if (!token) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    let account = await database.getAccountByToken(token);

    if (account == null) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    delete account.settings;
    delete account.token;
    delete account.created_at;

    if (req.body.username == account.username && req.body.email == account.email && (req.body.password == "" || req.body.password == null)) {
      const attemptToUpdateAvi = await database.updateAccount(req.body.avatar, req.body.email, req.body.username, null, null);

      if (attemptToUpdateAvi) {
        account = await database.getAccountByEmail(req.body.email);

        if (account != null) {
          delete account.password;

          await gateway.dispatchEventTo(token, {
             t: "USER_UPDATE",
             op: 0,
             s: null,
             d: account
          })
  
          return res.status(200).json(account);
        }
      }

      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    } else {
      if (!req.body.username || req.body.username == "") {
        return res.status(400).json({
          code: 400,
          username: "This field is required"
        })
      }

      if (!req.body.password || req.body.password == "") {
        return res.status(400).json({
          code: 400,
          password: "This field is required"
        })
      }

      if (!req.body.email || req.body.email == "") {
        return res.status(400).json({
          code: 400,
          email: "This field is required"
        })
      }

      if (req.body.username.length < 2) {
        return res.status(400).json({
          code: 400,
          username: "Must be between 2 and 32 characters"
        })
      }

      if (account.password == null) {
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
      }

      const correctPassword = await database.doesThisMatchPassword(req.body.password, account.password);

      if (!correctPassword) {
        return res.status(400).json({
          code: 400,
          password: "Incorrect password"
        })
      }

      const update = await database.updateAccount(req.body.avatar, req.body.email, req.body.username, req.body.password, req.body.new_password);

      if (update) {
        account = await database.getAccountByEmail(req.body.email);

        if (account != null) {
          delete account.settings;
          delete account.password;
          delete account.token;
          delete account.created_at;

          await gateway.dispatchEventTo(token, {
            t: "USER_UPDATE",
            op: 0,
            s: null,
            d: account
         })
          
          return res.status(200).json(account);
        }
      }

      return res.status(400).json({
        code: 400,
        username: "Something went wrong while updating account details.",
        email: "Check all input fields correctly.",
        password: "And try again."
      })
    }
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    });
  }
});

router.patch("/settings", async (req: Request, res: Response) => {
  try {
    const token = req.headers['authorization'];

    if (!token) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    let account = await database.getAccountByToken(token);

    if (account == null) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    let new_settings = account.settings;
    
    if (new_settings == null) {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      });
    }

    for (var shit in req.body) {
      var key = shit.toUpperCase();
      var value = req.body[shit];

      if (key == 'THEME') {
        new_settings = new_settings.replace(`${key}:LIGHT`, `${key}:${(value.toUpperCase())}`);

        new_settings = new_settings.replace(`${key}:DARK`, `${key}:${(value.toUpperCase())}`);
      } else {
        new_settings = new_settings.replace(`${key}:1`, `${key}:${(value == true) ? "1" : "0"}`);

        new_settings = new_settings.replace(`${key}:0`, `${key}:${(value == true) ? "1" : "0"}`);
      }
    }

    const attempt = await database.updateSettings(account.id, new_settings);

    if (attempt) {
      const settings = {
        inline_embed_media: new_settings.includes("INLINE_EMBED_MEDIA:1"),
        inline_attachment_media: new_settings.includes("INLINE_ATTACHMENT_MEDIA:1"),
        render_embeds: new_settings.includes("RENDER_EMBEDS:1"),
        enable_tts_command: new_settings.includes("ENABLE_TTS_COMMAND:1"),
        theme: new_settings.includes("THEME:DARK") ? "dark" : "light"
      }

      gateway.dispatchEventTo(token, {
        t: "USER_SETTINGS_UPDATE",
        op: 0,
        s: null,
        d: settings
      });

      return res.status(200).json(settings);
    } else {
      return res.status(500).json({
        code: 500,
        message: "Internal Server Error"
      })
    }
  } catch (error: any) {
    logText(error.toString(), "error");

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error"
    })
  }
});

export default router;