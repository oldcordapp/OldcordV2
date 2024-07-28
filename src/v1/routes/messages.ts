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

router.param('messageid', async (req: any, res: any, next: any, messageid: any) => {
    req.message = await database.getMessageById(messageid);
    next();
});

router.get("/", globalUtils.channelPermissionsMiddleware("READ_MESSAGE_HISTORY"), async (req: any, res: any) => {
    try {
        const creator = req.account;

        if (creator == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const channel = req.channel;

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        let limit = parseInt(req.query.limit) || 200;

        if (limit > 200) {
            limit = 200;
        }

        let messages: Message[] = [];

        if (req.query.before) {
            messages = await database.getChannelMessages(channel.id, limit, req.query.before);
        } else messages = await database.getChannelMessages(channel.id, limit);

        if (messages == null || messages.length == 0) {
            return res.status(200).json([]);
        }

        return res.status(200).json(messages);
    } catch (error: any) {
        logText(error.toString(), "error");

        return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
        });
    }
});

router.post("/", upload.single('file'), globalUtils.channelPermissionsMiddleware("SEND_MESSAGES"), globalUtils.rateLimitMiddleware(200, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const creator = req.account;

        if (creator == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        const channel = req.channel;

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        let finalContent: String = req.body.content;

        if (req.body.mentions && req.body.mentions.length > 0) {
            const mentions: string[] = req.body.mentions;
            
            for(let mention of mentions) {
                const user = await database.getAccountByUserId(mention);

                if (user != null) {
                    finalContent = finalContent.replace(`@${user.username}`, `<@${user.id}>`);
                }
            }

            req.body.content = finalContent;
        }

        if (finalContent && finalContent.includes("@everyone")) {
            let pCheck = await globalUtils.hasChannelPermissionTo(req.channel, req.guild, creator.id, "MENTION_EVERYONE");

            if (!pCheck) {
                finalContent = finalContent.replace(/@everyone/g, "");
            } 

            req.body.content = finalContent;
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
                let canTts = await globalUtils.hasChannelPermissionTo(req.channel, req.guild, creator.id, "SEND_TTS_MESSAGES");

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
        console.log(error.toString());

        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

router.delete("/:messageid", globalUtils.channelPermissionsMiddleware("MANAGE_MESSAGES"), globalUtils.rateLimitMiddleware(50, 1000 * 60 * 60), async (req: any, res: any) => {
    try {
        const guy = req.account;

        if (guy == null) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const message = req.message;

        if (message == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Message"
            });
        }

        const channel = req.channel;

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

router.patch("/:messageid", async (req: any, res: any) => {
    try {
        if (req.body.content && req.body.content == "") {
            return res.status(403).json({
                code: 403,
                message: "Missing Permissions"
            });
        }
        
        const guy = req.account;

        if (guy == null) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        let message = req.message;

        if (message == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Message"
            });
        }

        const channel = req.channel;

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

            let finalContent: String = req.body.content;

            if (req.body.mentions && req.body.mentions.length > 0) {
                const mentions: string[] = req.body.mentions;
                
                for(let mention of mentions) {
                    const user = await database.getAccountByUserId(mention);

                    if (user != null) {
                        finalContent = finalContent.replace(`@${user.username}`, `<@${user.id}>`);
                    }
                }

                req.body.content = finalContent;
            }

            if (finalContent && finalContent.includes("@everyone")) {
                let pCheck = await globalUtils.hasChannelPermissionTo(req.channel, req.guild, message.author.id, "MENTION_EVERYONE");

                if (!pCheck) {
                    finalContent = finalContent.replace(/@everyone/g, "");
                } 

                req.body.content = finalContent;
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

            return res.status(204).send();
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

            let finalContent: String = req.body.content;

            if (req.body.mentions && req.body.mentions.length > 0) {
                const mentions: string[] = req.body.mentions;
                
                for(let mention of mentions) {
                    const user = await database.getAccountByUserId(mention);

                    if (user != null) {
                        finalContent = finalContent.replace(`@${user.username}`, `<@${user.id}>`);
                    }
                }

                req.body.content = finalContent;
            }

            if (finalContent && finalContent.includes("@everyone")) {
                let pCheck = await globalUtils.hasChannelPermissionTo(req.channel, req.guild, message.author.id, "MENTION_EVERYONE");

                if (!pCheck) {
                    finalContent = finalContent.replace(/@everyone/g, "");
                } 

                req.body.content = finalContent;
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

router.post("/:messageid/ack", async (req: any, res: any) => {
    try {
        const guy = req.account;

        if (guy == null || !guy.token) {
            return res.status(401).json({
                code: 401,
                message: "Unauthorized"
            });
        }

        const message = req.message;

        if (message == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Message"
            });
        }

        const channel = req.channel;

        if (channel == null) {
            return res.status(404).json({
                code: 404,
                message: "Unknown Channel"
            });
        }

        let tryAck = await database.acknowledgeMessage(guy.id, channel.id, message.id, 0);

        if (!tryAck) {
            return res.status(500).json({
                code: 500,
                message: "Internal Server Error"
            });
        }

        await gateway.dispatchEventTo(guy.token, {
            t: "MESSAGE_ACK",
            op: 0,
            s: null,
            d: {
                channel_id: channel.id,
                message_id: message.id
            }
        });
        
        return res.status(204).send();
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

export default router;