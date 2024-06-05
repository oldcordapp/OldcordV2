import * as express from 'express';
import { Request, Response } from 'express';
import auth from './routes/auth';
import voice from './routes/voice';
import users from './routes/users/users';
import * as cors from 'cors';
import * as fs from 'fs';
import { createServer } from 'http';
import * as https from 'https';
import { logText } from './utils/logger';
import globalUtils from './utils/global';
import database from './utils/database';
//import v6Database from './v6/utils/database';
import config from './utils/config';
import gateway from './gateway';
import webrtc from './webrtc';
import tutorial from './routes/tutorial/tutorial'
import guilds from './routes/guilds';
import invites from './routes/invites';
import channels from './routes/channels';
import Presence from './interfaces/presence';
import Invite from './interfaces/guild/invite';
import v6 from './v6/v6'; //experimental
import * as cookieParser from 'cookie-parser';
import * as request from 'request';
import * as wayback from 'wayback-machine';
import admin from './routes/admin/admin';

const app = express();

let version = "september_2_2015"; //september_2_2015 for second oldest build of 2015

app.use(express.json());

app.use(cookieParser());

app.use(cors());

app.use((err: any, req: Request, res: Response, next: any) => {
    logText(`[${req.method}] -> ${req.url}`, "debug");

    let token = req.headers['authorization'];

    if (!token || !globalUtils.checkToken(token)) {
        return res.status(401).json({
            code: 401,
            message: "Unauthorized"
        });
    }

    next();
});

app.use('/assets', express.static(__dirname + '/assets'));
app.use('/assets', express.static(__dirname + '/assets/2015'));
app.use('/assets', express.static(__dirname + '/assets/2016'));
app.use('/assets', express.static(__dirname + '/assets/2017'));
app.use('/icons/', express.static(__dirname + '/user_assets/icons'));
app.use('/avatars/', express.static(__dirname + '/user_assets/avatars'));
app.use('/attachments/', express.static(__dirname + '/user_assets/attachments'));

let cached404s = {};

function convertTimestampToCustomFormat(timestamp) {
    const dateObject = new Date(timestamp);
  
    const year = dateObject.getUTCFullYear();
    const month = String(dateObject.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObject.getUTCDate()).padStart(2, '0');
    const hours = String(dateObject.getUTCHours()).padStart(2, '0');
    const minutes = String(dateObject.getUTCMinutes()).padStart(2, '0');
    const seconds = String(dateObject.getUTCSeconds()).padStart(2, '0');
  
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

app.get("/assets/:asset", (req: Request, res: Response) => {
    let release = req.cookies['release_date'];
    
    if (!release) {
        release = "september_2_2015"
    }

    if (config.cache404s && cached404s[req.params.asset]) {
        return res.status(404).send("File not found");
    }

    let year = release.includes("2015") ? "2015" : release.includes("2016") ? "2016" : "2017";

    if (!fs.existsSync(`${__dirname}/assets/${req.params.asset}`) && !fs.existsSync(`${__dirname}/assets/${year}/${req.params.asset}`)) {
        wayback.getTimeline(`https://discordapp.com/assets/${req.params.asset}`, function(err, timeline) {
            if (err) {
                cached404s[req.params.asset] = 1;

                return res.status(404).send("File not found");
            }

            if (timeline.original == null && timeline.timegate == null && timeline.first == null && timeline.last == null && timeline.mementos.length == 0) {
                cached404s[req.params.asset] = 1;

                return res.status(404).send("File not found");
            }
        
            let timestamp = convertTimestampToCustomFormat(timeline.first.time);
            let snapshot_url = `https://web.archive.org/web/${timestamp}im_/https://discordapp.com/assets/${req.params.asset}`;

            request(snapshot_url, { encoding: null }, (err, resp, body) => {
                if (err) {
                    cached404s[req.params.asset] = 1;

                    return res.status(404).send("File not found");
                }

                if (snapshot_url.endsWith(".js")) {
                    let str = Buffer.from(body).toString("utf-8");

                    str = str.replace("cdn.discordapp.com", (config.local_deploy ? config.base_url + ":" + config.port : config.base_url));
                    str = str.replace("discord.gg", (config.local_deploy ? config.base_url + ":" + config.port : config.base_url) + "/invites");
                    str = str.replace("d3dsisomax34re.cloudfront.net", (config.local_deploy ? config.base_url + ":" + config.port : config.base_url));
                    str = str.replace(/discordapp.com/g, (config.local_deploy ? config.base_url + ":" + config.port : config.base_url));

                    body = Buffer.from(str);

                    fs.writeFileSync(`./assets/${year}/${req.params.asset}`, str, "utf-8");
                } else {
                    fs.writeFileSync(`./assets/${year}/${req.params.asset}`, body);
                }

                console.log(`[LOG] Saved ${req.params.asset} from ${snapshot_url} successfully.`);

                res.writeHead(resp.statusCode, { "Content-Type": resp.headers["content-type"] })
                res.status(resp.statusCode).end(body);
            });
        });
    }
});

//app.use("/api/v6", v6);
app.use("/api/auth", auth);
app.use("/api/admin", admin);
app.use("/api/users", users);
app.use("/api/voice", voice);
app.use("/api/tutorial", tutorial);
app.use("/api/guilds", guilds);
app.use("/api/channels", channels);
app.use("/api/invite", invites);

app.post("/api/track", (req: Request, res: Response) => {
    return res.status(204).send();
});

app.get("/api/gateway", (req: Request, res: Response) => {
    return res.status(200).json({
        url: `${config.use_wss ? 'wss' : 'ws'}://${config.gateway == "" ? req.headers['host']?.split(':')[0] : config.gateway}${config.gateway_has_no_port ? '' : `:${config.use_same_port ? config.port : config.ws_port}`}`
    });
});

app.get("/api/servers/:guildid/widget.json", async (req: Request, res: Response) => {
    try {
        const guild = await database.getGuildById(req.params.guildid);

        if (guild == null) {
            return res.status(404).json({
                code: 404,
                message: "Widget not found"
            });
        }

        const widget = await database.getGuildWidget(req.params.guildid);

        if (widget == null) {
            return res.status(404).json({
                code: 404,
                message: "Widget not found"
            });
        }

        if (!widget.enabled) {
            return res.status(404).json({
                code: 404,
                message: "Widget not found"
            });
        }

        let invite: any = null;

        if (widget.channel_id != null) {
            const channel = await database.getChannelById(widget.channel_id);

            if (channel != null) {
                const guild_invites: Invite[] = await database.getGuildInvites(req.params.guildid);

                if (guild_invites.length == 0) {
                    const invite_shit = await database.createInvite(req.params.guildid, widget.channel_id, "1121063764309889024", false, 0, 0, false);
                    
                    if (invite_shit != null) {
                        invite = `${config.use_wss ? 'https' : 'http'}://${config.base_url}${config.local_deploy ? `:${config.port}` : ''}/invite/${invite_shit.code}`;
                    }
                } else {
                    const try_find_invite: Invite[] | [] = guild_invites.filter(x => x.channel.id == widget.channel_id && x.max_uses == 0 && x.max_age == 0);

                    if (try_find_invite.length == 0) {
                        const invite_shit = await database.createInvite(req.params.guildid, widget.channel_id, "1121063764309889024", false, 0, 0, false);
                    
                        if (invite_shit != null) {
                            invite = `${config.use_wss ? 'https' : 'http'}://${config.base_url}${config.local_deploy ? `:${config.port}` : ''}/invite/${invite_shit.code}`;
                        }
                    } else {
                        invite = `${config.use_wss ? 'https' : 'http'}://${config.base_url}${config.local_deploy ? `:${config.port}` : ''}/invite/${try_find_invite[0].code}`;
                    }
                }
            }
        }

        const channels = await database.getGuildChannels(req.params.guildid);

        if (channels.length == 0) {
            return res.status(200).json({});
        }

        const members = await database.getGuildMembers(req.params.guildid);
        const presences = await database.getGuildPresences(req.params.guildid);
            
        if (members.length == 0) {
            return res.status(200).json({});
        }

        let json_channels: any[] = [];
        let json_members: any[] = [];

        for(let channel of channels) {
            if (channel.type == 'voice') {
                json_channels.push({
                    position: channel.position,
                    id: channel.id,
                    name: channel.name
                })
            }
        }

        for(var member of members) {
            let presence: Presence | undefined = presences.filter((x: Presence) => x.user?.id === member.id)[0];
                
            if (presence != undefined) {
                if (presence.game != null) {
                    json_members.push({
                        username: member.user.username,
                        status: presence.status,
                        game: presence.game,
                        avatar: member.user.avatar,
                        avatar_url: globalUtils.getAvatarURL(member.user.avatar, member.user.id) == null ? null : globalUtils.getAvatarURL(member.user.avatar, member.user.id),
                        discriminator: member.user.discriminator,
                        id: member.user.id
                    })
                } else {
                    json_members.push({
                        username: member.user.username,
                        status: presence.status,
                        avatar_url: globalUtils.getAvatarURL(member.user.avatar, member.user.id) == null ? null : globalUtils.getAvatarURL(member.user.avatar, member.user.id),
                        discriminator: member.user.discriminator,
                        id: member.user.id
                    })
                }
            } else {
                json_members.push({
                    username: member.user.username,
                    status: "offline",
                    avatar_url: globalUtils.getAvatarURL(member.user.avatar, member.user.id) == null ? null : globalUtils.getAvatarURL(member.user.avatar, member.user.id),
                    discriminator: member.user.discriminator,
                    id: member.user.id
                })
            }
        }

        return res.status(200).json({
            channels: json_channels,
            instant_invite: invite,
            id: guild.id,
            members: json_members,
            name: guild.name
        });
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
          code: 500,
          message: "Internal Server Error"
        });
    }
});

app.get("/widget", async (req: Request, res: Response) => {
    try {
        if (!req.query.id) {
            return res.status(404).json({
                code: 404,
                message: "Widget not found"
            });
        }

        const guild = await database.getGuildById(req.query.id.toString());

        if (guild == null) {
            return res.status(404).json({
                code: 404,
                message: "Widget not found"
            });
        }

        const widget = await database.getGuildWidget(req.query.id.toString());

        if (widget == null || !widget.enabled) {
            return res.status(404).json({
                code: 404,
                message: "Widget not found"
            });
        }

        return res.send(fs.readFileSync(`./assets/widget_2015/widget.html`, 'utf8'));
    } catch (error: any) {
        logText(error.toString(), "error");
    
        return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
        });
    }
});

app.get("/invite/:code", async (req: Request, res: Response) => {
    let release = req.cookies['release_date'];
    
    if (!release) {
        release = "september_2_2015"
    }

    let year = release.includes("2015") ? "2015" : release.includes("2016") ? "2016" : "2017";

    return res.send(fs.readFileSync(`./assets/${year}/${version}/invite.html`, 'utf8'));
});

app.get("/selector", (req: Request, res: Response) => {
    res.send(fs.readFileSync(`./assets/selector/selector.html`, 'utf8'));
});

app.get("/launch", (req: Request, res: Response) => {
    if (!req.query.release_date) {
        req.query.release_date = "september_2_2015";
    }
    
    res.cookie('release_date', req.query.release_date);

    res.redirect("/");
});

app.get("/channels/:guildid/:channelid", (req: Request, res: Response) => {
    res.redirect("/"); //temp fix - this wont trigger when using the client normally but when you refresh, it will.
});

app.get("*", (req: Request, res: Response) => {
    if (!req.cookies['release_date']) {
        res.redirect("/selector");
    } else {
        if (!fs.existsSync(`./assets/${version.includes("2015") ? "2015" : version.includes("2016") ? "2016" : "2017"}/${req.cookies['release_date']}`)) {
            res.cookie('release_date', 'september_2_2015');
            //fuck you lol
        }

        version = req.cookies['release_date'];

        res.send(fs.readFileSync(`./assets/${version.includes("2015") ? "2015" : version.includes("2016") ? "2016" : "2017"}/${version}/app.html`, 'utf8'));
    }
});

if (config.use_same_port) {
    if (config.use_wss && config.key_path != "" && config.cert_path != "") {
        let server = https.createServer({
            cert: fs.readFileSync(config.cert_path),
            key: fs.readFileSync(config.key_path)
        });

        gateway.ready(server);

        server.listen(config.port, () => {
            database.setupDatabase();
            //v6Database.setupDatabase();
            
            console.log("[OLDCORDV2] <RECONNECT TO A BETTER TIME>: Online!");
        })
    
        server.on('request', app);
    } else {
        let server = createServer();

        gateway.ready(server);

        webrtc.regularReady(1338);

        server.listen(config.port, () => {
            database.setupDatabase();
            //v6Database.setupDatabase();
            
            console.log("[OLDCORDV2] <RECONNECT TO A BETTER TIME>: Online!");
        })
    
        server.on('request', app);
    }
} else {
    gateway.regularReady(config.ws_port);

    app.listen(config.port, () => {
        database.setupDatabase();
        //v6Database.setupDatabase();
        
        console.log(`[OLDCORDV2] <RECONNECT TO A BETTER TIME>: Online! Gateway port: ${config.ws_port} - HTTP port: ${config.port}`);
    });
}