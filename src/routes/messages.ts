import * as express from 'express';
import { Request, Response } from 'express';
import gateway from '../gateway';
import database from '../utils/database';
import { logText } from '../utils/logger';
import Message from '../interfaces/guild/message';
import globalUtils from '../utils/global';
import * as fs from 'fs';
import * as multer from 'multer';
import sizeOf from 'image-size';
import Snowflake from '../utils/snowflake';
import UploadAttachment from '../interfaces/uploadattachment'

const upload = multer();

const router = express.Router({ mergeParams: true });

router.get("/", globalUtils.channelPermissionsMiddleware("READ_MESSAGE_HISTORY"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const creator = await database.getAccountByToken(token);

        if (creator == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const channel = await database.getChannelById(req.params.channelid);

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        if (channel.recipient != null) {
            const messages: Message[] = await database.getChannelMessages(channel.id);
    
            if (messages == null || messages.length == 0) {
                return res.status(200).json([]);
            }
    
            const ret: Message[] = [];
    
            if (req.query.before) {
                const msg: Message | undefined = messages.find(x => x.id == req.query.before);
    
                if (msg != null) {
                    const index: number = messages.indexOf(msg);
                    let counter: number = 0;
    
                    for (let i = index; i < messages.length + 1; i++) {
                        if (counter == Number(req.query.limit)) {
                            continue;
                        }
                
                        var message = messages[i];
                
                        if (message == null) {
                            continue;
                        }
                
                        ret.push(message);
                
                        counter++;
                    }
                }
    
                return res.status(200).json(messages);
            } else {
                let count: number = 0;
    
                for(let msg of messages) {
                    if (count == Number(req.query.limit)) {
                        continue;
                    }
    
                    if (msg == null) {
                        continue;
                    }
    
                    ret.push(msg);
    
                    count++;
                }
            }
    
            return res.status(200).json(messages);
        } else {
            if (!channel.guild_id) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }
    
            const messages: Message[] = await database.getChannelMessages(channel.id);
    
            if (messages == null || messages.length == 0) {
                return res.status(200).json([]);
            }
    
            const ret: Message[] = [];
    
            if (req.query.before) {
                const msg: Message | undefined = messages.find(x => x.id == req.query.before);
    
                if (msg != null) {
                    const index: number = messages.indexOf(msg);
                    let counter: number = 0;
    
                    for (let i = index; i < messages.length + 1; i++) {
                        if (counter == Number(req.query.limit)) {
                            continue;
                        }
                
                        var message = messages[i];
                
                        if (message == null) {
                            continue;
                        }
                
                        ret.push(message);
                
                        counter++;
                    }
                }
    
                return res.status(200).json(messages);
            } else {
                let count: number = 0;
    
                for(let msg of messages) {
                    if (count == Number(req.query.limit)) {
                        continue;
                    }
    
                    if (msg == null) {
                        continue;
                    }
    
                    ret.push(msg);
    
                    count++;
                }
            }
    
            return res.status(200).json(messages);
        }
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.post("/", upload.single('file'), globalUtils.channelPermissionsMiddleware("SEND_MESSAGES"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const creator = await database.getAccountByToken(token);

        if (creator == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const channel = await database.getChannelById(req.params.channelid);

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        if (channel.recipient != null) {
            const recipient = await database.getAccountByUserId(channel.recipient.id);

            if (recipient == null || !recipient.token) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }

            if (req.file) {
                let extension = req.file.mimetype.replace("image/", "").replace("video/", "");
                let attachment_id = Snowflake.generate();
    
                extension = extension.replace("jpeg", "jpg");
    
                let name = req.file.originalname.split(".")[0];
                let size = req.file.size;
    
                if (!fs.existsSync(`./user_assets/attachments/${channel.id}`)) {
                    fs.mkdirSync(`./user_assets/attachments/${channel.id}`, { recursive: true });
                }
    
                if (!fs.existsSync(`./user_assets/attachments/${channel.id}/${attachment_id}`)) {
                    fs.mkdirSync(`./user_assets/attachments/${channel.id}/${attachment_id}`, { recursive: true });
                }
    
                fs.writeFileSync(`./user_assets/attachments/${channel.id}/${attachment_id}/${name}.${extension}`, req.file.buffer);
    
                sizeOf(`./user_assets/attachments/${channel.id}/${attachment_id}/${name}.${extension}`, async (err, dimensions) => {
                    const attachment: UploadAttachment = {
                        id: attachment_id,
                        size: size,
                        width: dimensions?.width,
                        height: dimensions?.height,
                        name: `${name}.${extension}`,
                        extension: extension
                    };
    
                    const createMessage = await database.createMessage(!channel.guild_id ? null : channel.guild_id, channel.id, creator.id, req.body.content, req.body.nonce, attachment, req.body.tts);

                    if (createMessage == null) {
                        return res.status(500).json({
                            code: 500,
                            message: "Internal Server Error"
                        });
                    }

                    await gateway.dispatchInDM(creator.id, recipient.id, {
                        t: "MESSAGE_CREATE",
                        s: null,
                        op: 0,
                        d: createMessage
                    });

                    return res.status(200).json(createMessage);
                });
            } else {
                const createMessage = await database.createMessage(!channel.guild_id ? null : channel.guild_id, channel.id, creator.id, req.body.content, req.body.nonce, null, req.body.tts);
    
                if (createMessage == null) {
                    return res.status(500).json({
                        code: 500,
                        message: "Internal Server Error"
                    });
                }
        
                await gateway.dispatchInDM(creator.id, recipient.id, {
                    t: "MESSAGE_CREATE",
                    s: null,
                    op: 0,
                    d: createMessage
                });
        
                return res.status(200).json(createMessage);
            }
        } else {
            if (!channel.guild_id) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }

            if (req.body.tts == true) {
                let canTts = await globalUtils.hasChannelPermissionTo(channel.id, creator.id, "SEND_TTS_MESSAGES");

                if (!canTts) {
                    req.body.tts = canTts;
                }
            }
    
            if (req.file) {
                let extension = req.file.mimetype.replace("image/", "").replace("video/", "");
                let attachment_id = Snowflake.generate();
    
                extension = extension.replace("jpeg", "jpg");
    
                let name = req.file.originalname.split(".")[0];
                let size = req.file.size;
    
                if (!fs.existsSync(`./user_assets/attachments/${channel.id}`)) {
                    fs.mkdirSync(`./user_assets/attachments/${channel.id}`, { recursive: true });
                }
    
                if (!fs.existsSync(`./user_assets/attachments/${channel.id}/${attachment_id}`)) {
                    fs.mkdirSync(`./user_assets/attachments/${channel.id}/${attachment_id}`, { recursive: true });
                }
    
                fs.writeFileSync(`./user_assets/attachments/${channel.id}/${attachment_id}/${name}.${extension}`, req.file.buffer);
    
                sizeOf(`./user_assets/attachments/${channel.id}/${attachment_id}/${name}.${extension}`, async (err, dimensions) => {
                    const attachment: UploadAttachment = {
                        id: attachment_id,
                        size: size,
                        width: dimensions?.width,
                        height: dimensions?.height,
                        name: `${name}.${extension}`,
                        extension: extension
                    };
    
                    const createMessage = await database.createMessage(!channel.guild_id ? null : channel.guild_id, channel.id, creator.id, req.body.content, req.body.nonce, attachment, req.body.tts);

                    if (createMessage == null) {
                        return res.status(500).json({
                            code: 500,
                            message: "Internal Server Error"
                        });
                    }
            
                    await gateway.dispatchEventInChannel(channel.id, {
                        t: "MESSAGE_CREATE",
                        s: null,
                        op: 0,
                        d: createMessage
                    });
            
                    return res.status(200).json(createMessage);
                });
            } else {
                const createMessage = await database.createMessage(!channel.guild_id ? null : channel.guild_id, channel.id, creator.id, req.body.content, req.body.nonce, null, req.body.tts);
    
                if (createMessage == null) {
                    return res.status(500).json({
                        code: 500,
                        message: "Internal Server Error"
                    });
                }
        
                await gateway.dispatchEventInChannel(channel.id, {
                    t: "MESSAGE_CREATE",
                    s: null,
                    op: 0,
                    d: createMessage
                });
        
                return res.status(200).json(createMessage);
            }
        }
      } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:messageid", globalUtils.channelPermissionsMiddleware("MANAGE_MESSAGES"), async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }
        
        const guy = await database.getAccountByToken(token);

        if (guy == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const message = await database.getMessageById(req.params.messageid);

        if (message == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Message"
            });
        }

        const channel = await database.getChannelById(req.params.channelid);

        if (channel == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (channel.recipient != null) {
            if (message.author.id != guy.id) {
                return res.status(403).json({
                    code: 403,
                    message: "Missing Permissions"
                });
            }
    
            const del = await database.deleteMessage(req.params.messageid);
    
            if (!del) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            await gateway.dispatchInDM(guy.id, channel.recipient.id, {
                t: "MESSAGE_DELETE",
                s: null,
                op: 0,
                d: {
                    id: req.params.messageid,
                    guild_id: channel.guild_id,
                    channel_id: req.params.channelid
                }
            });
    
            return res.status(204).send();
        } else {
            if (!channel.guild_id) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }
    
            const del = await database.deleteMessage(req.params.messageid);
    
            if (!del) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
    
            await gateway.dispatchEventInChannel(channel.id, {
                op: 0,
                t: "MESSAGE_DELETE",
                s: null,
                d: {
                    id: req.params.messageid,
                    guild_id: channel.guild_id,
                    channel_id: req.params.channelid
                }
            })
    
            return res.status(204).send();
        }
        
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.patch("/:messageid", async (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
    
        if (!token) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (req.body.content && req.body.content == "") {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }
        
        const guy = await database.getAccountByToken(token);

        if (guy == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let message = await database.getMessageById(req.params.messageid);

        if (message == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Message"
            });
        }

        const channel = await database.getChannelById(req.params.channelid);

        if (channel == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        if (channel.recipient != null) {
            if (message.author.id != guy.id) {
                return res.status(403).json({
                    code: 403,
                    message: "Missing Permissions"
                });
            }

            const update = await database.updateMessage(message.id, req.body.content);

            if (!update) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            message = await database.getMessageById(req.params.messageid);

            if (message == null) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Message"
                });
            }

            await gateway.dispatchInDM(guy.id, channel.recipient.id, {
                op: 0,
                t: "MESSAGE_UPDATE",
                s: null,
                d: message
            })

            return res.status(200).send();
        } else {
            if (!channel.guild_id) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Channel"
                });
            }

            const inGuild = await globalUtils.isInGuild(guy.id, channel.guild_id);

            if (!inGuild) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Guild"
                });
            }

            if (message.author.id != guy.id) {
                return res.status(403).json({
                    code: 403,
                    message: "Missing Permissions"
                });
            }

            const update = await database.updateMessage(message.id, req.body.content);

            if (!update) {
                return res.status(500).json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }

            message = await database.getMessageById(req.params.messageid);

            if (message == null) {
                return res.status(404).json({
                    code: 404,
                    message: "Unknown Message"
                });
            }

            await gateway.dispatchEventInChannel(channel.id, {
                op: 0,
                t: "MESSAGE_UPDATE",
                s: null,
                d: message
            })

            return res.status(200).send();
        }
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;