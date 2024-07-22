import Gateway from "./interfaces/gateway/gateway";
import * as WebSocket from "ws";
import { logText } from "./utils/logger";
import database from "./utils/database";
import globalUtils from "./utils/global";
import Channel from "./interfaces/guild/channel";
import ExtWebSocket from "./interfaces/gateway/extwebsocket"

const gateway: Gateway = {
    server: null,
    port: null,
    clients: [],
    dispatchEventToAll: (data: any) => {
        for(var client of gateway.clients) {
            gateway.send(client.socket, data);
        }

        return true;
    },
    getSocket: (token: string) => {
        const search = gateway.clients.filter(x => x.token == token);

        return search.length > 0 ? search[0].socket : null;
    },
    dispatchEventTo: (token: string, data: any) => {
        const socket = gateway.getSocket(token);

        if (socket == null) {
            return false;
        }

        gateway.send(socket, data);

        return true;
    },
    dispatchInDM: async (sender_id: string, receiver_id: string, data: any) => {
        const sender = await database.getAccountByUserId(sender_id);

        if (sender == null || !sender.token) {
            return false;
        }

        const receiver = await database.getAccountByUserId(receiver_id);

        if (receiver == null || !receiver.token) {
            return false;
        }

        const socket1 = gateway.getSocket(sender.token);
        const socket2 = gateway.getSocket(receiver.token);

        if (socket1 == null) {
            return false;
        }

        if (socket2 == null) {
            return false;
        }

        gateway.send(socket1, data);
        gateway.send(socket2, data);

        return true;
    },
    dispatchEventToAllPerms: async (guild_id: string, channel_id: string | null, permission_check: string, data: any) => {
        const guild = await database.getGuildById(guild_id);

        if (guild == null) {
            return false;
        }

        let chanId: string | null = channel_id;
        let checkChannel = true;

        if (chanId == null) {
            chanId = "...";
            checkChannel = false;
        }

        const channel = await database.getChannelById(chanId);

        if (channel == null && checkChannel) {
            return false;
        }

        const members = await database.getGuildMembers(guild_id);

        if (members.length == 0) {
            return false;
        }

        for(var member of members) {
            let account = await database.getAccountByUserId(member.id);

            if (account == null || !account.token) {
                return false;
            }

            const guildPermCheck = await globalUtils.hasGuildPermissionTo(guild.id, account.id, permission_check);

            if (checkChannel && channel != null) {
                const channelPermCheck = await globalUtils.hasChannelPermissionTo(channel.id, account.id, permission_check);

                if (!guildPermCheck && !channelPermCheck) {
                    return false;
                }
            }

            if (!guildPermCheck) {
                return false;
            }

            var socket = gateway.getSocket(account.token);

            if (socket == null) {
                return false;
            }

            await gateway.send(socket, data);
        }

        return true;
    },
    dispatchEventToPerms: async (token: string, guild_id: string, channel_id: string | null, permission_check: string, data: any) => {
        let account = await database.getAccountByToken(token);

        if (account == null) {
            return false;
        }

        let guild = await database.getGuildById(guild_id);

        if (guild == null) {
            return false;
        }

        let chanId: string | null = channel_id;
        let checkChannel = true;

        if (chanId == null) {
            chanId = "...";
            checkChannel = false;
        }

        const channel = await database.getChannelById(chanId);

        if (channel == null && !checkChannel) {
            return false;
        }

        const guildPermCheck = await globalUtils.hasGuildPermissionTo(guild.id, account.id, permission_check);

        if (checkChannel && channel != null) {
            const channelPermCheck = await globalUtils.hasChannelPermissionTo(channel.id, account.id, permission_check);

            if (!guildPermCheck && !channelPermCheck) {
                return false;
            }
        }

        if (!guildPermCheck) {
            return false;
        }

        var socket = gateway.getSocket(token);

        if (socket == null) {
            return false;
        }

        await gateway.send(socket, data);

        return true;
    },
    dispatchEventInGuild: async (guild_id: string, data: any) => {
        const guild = await database.getGuildById(guild_id);

        if (guild == null) {
            return false;
        }

        const members = await database.getGuildMembers(guild_id);

        if (members.length == 0) {
            return false;
        }

        for(var member of members) {
            let account = await database.getAccountByUserId(member.id);

            if (account == null || !account.token) {
                return false;
            }

            var socket = gateway.getSocket(account.token);

            if (socket == null) {
                return false;
            }
            
            await gateway.send(socket, data);
        }

        return true;
    },
    dispatchEventInChannel: async (channel_id: string, data: any) => {
        const channel = await database.getChannelById(channel_id);

        if (channel == null || !channel.guild_id) {
            return false;
        }

        const guild = await database.getGuildById(channel.guild_id);

        if (guild == null) {
            return false;
        }

        const members = await database.getGuildMembers(channel.guild_id);

        if (members.length == 0) {
            return false;
        }

        for(var member of members) {
            let permissions = await globalUtils.hasChannelPermissionTo(channel.id, member.id, "READ_MESSAGES");

            if (!permissions) {
                return false;
            }

            let account = await database.getAccountByUserId(member.id);

            if (account == null || !account.token) {
                return false;
            }

            var socket = gateway.getSocket(account.token);

            if (socket == null) {
                return false;
            }

            await gateway.send(socket, data);
        }

        return true;
    },
    send: (socket: WebSocket, data: any) => {
        logText(`Outgoing -> ${JSON.stringify(data)}`, "GATEWAY");

        socket.send(JSON.stringify(data));
    },
    handleEvents: () => {
        const server: WebSocket.Server = gateway.server as WebSocket.Server;

        server.on('close', async () => {
            for(var client of gateway.clients) {
                let user = client.user;

                if (user != null) {
                    await globalUtils.dispatchPresenceUpdate(user.id, "offline", null);
    
                    await database.updatePresence(user.id, "offline", null);
        
                    logText("Global disconnection", "GATEWAY");
    
                    gateway.clients = [];
                }
            }
        });

        server.on("listening", async () => {
            await database.quickSetEveryoneOffline();

            logText("[!] Everyone set to offline for quick temp bug fix [!]", "GATEWAY");

            logText("Listening for connections", "GATEWAY")
        });

        server.on("connection", (socket: ExtWebSocket) => {
            const HBINTERVAL = 45000;
            const HBTIMEOUT = HBINTERVAL + 20000;
            const HBEXTRA = HBINTERVAL - 30000;

            logText("New client connection", "GATEWAY")

            function resetHB() {
                socket.hbTimeout = setTimeout(() => {
                    socket.send(JSON.stringify({
                        op: 1,
                        d: null
                    }));

                    socket.hbTimeout = setTimeout(() => socket.close(4009, 'Session timed out'), HBEXTRA);
                }, HBTIMEOUT);
            }

            resetHB();

            socket.on("close", async () => {
                if (socket.user != null) {
                    await globalUtils.dispatchPresenceUpdate(socket.user.id, "offline", null);
                    await database.updatePresence(socket.user.id, "offline", null);
        
                    logText(`Client ${socket.user.id} disconnected`, "GATEWAY");
        
                    gateway.clients = gateway.clients.filter(client => client.socket !== socket);
                }
        
                if (socket.hbTimeout) {
                    clearTimeout(socket.hbTimeout);
                }
            });

            socket.on("message", async (data: any) => {
                const msg = data.toString("utf-8");
                const packet = JSON.parse(msg);
    
                if (packet.op != 1) {
                    logText(`Incoming -> ${msg}`, "GATEWAY");
                }
    
                switch(packet.op) {
                    case 2:
                        let user = await database.getAccountByToken(packet.d.token);
    
                        if (user == null) {
                            return socket.close(4004, "Authentication Failed");
                        }

                        const existingConnection = await gateway.clients.filter(x => x.user.id == user?.id)[0];

                        if (existingConnection) {
                            existingConnection.socket.close(4008, 'New connection has been established. This one is no longer needed.');

                            gateway.clients = gateway.clients.filter(client => client.socket !== existingConnection.socket);

                            logText(`Client ${user.id} reconnected -> Continuing on this socket`, "GATEWAY");
                        }

                        const settings = user.settings;

                        delete user.settings;
                        delete user.token;
                        delete user.password;
                        delete user.created_at;
                        
                        gateway.clients.push({
                            token: packet.d.token,
                            sequence: 0,
                            socket: socket,
                            user: user
                        });

                        const client = await gateway.clients.filter(x => x.user.id == user?.id)[0];

                        await globalUtils.dispatchPresenceUpdate(user.id, "online", null)

                        await database.updatePresence(user.id, "online", null);

                        const guilds = await database.getUsersGuilds(user.id);

                        let presences: any[] = [];

                        for(var guild of guilds) {
                            let presencex = await database.getGuildPresences(guild.id)

                            if (presencex.length > 0) {
                                for(var pren of presencex) {
                                    presences.push({
                                        guild_id: guild.id,
                                        game_id: null,
                                        user: {
                                            avatar: pren.user.avatar,
                                            discriminator: pren.user.discriminator,
                                            id: pren.user.id,
                                            username: pren.user.username
                                        },
                                        status: pren.status
                                    })
                                }
                            }
                        }

                        const dms = await database.getDMChannels(user.id) as Channel[];

                        for (const dm of dms) {
                            let closed = await database.isDMClosed(user.id, dm.id);

                            if (closed) {
                                dms.splice(dms.indexOf(dm), 1);

                                continue;
                            }

                            if (dm.recipient && dm.recipient.id == user.id) {
                                const other_channels = dms.filter(y => y.id == dm.id && y.recipient && y.recipient.id != user?.id);

                                if (other_channels.length > 0 && other_channels[0].recipient) {
                                    dm.recipient.id = other_channels[0].recipient?.id;
                                }
                            }
                        }

                        if (socket.sequence) {
                            client.sequence++;
                            socket.sequence++;
                        }

                        let tutorial = await database.getTutorial(user.id);

                        if (tutorial == null) {
                            tutorial = {
                                indicators_suppressed: false,
                                indicators_confirmed: []
                            }
                        }

                        let heartbeat_interval = 45 * 1000;

                        gateway.send(socket, {
                            op: 0,
                            s: client.sequence,
                            t: "READY",
                            d: {
                                guilds: guilds,
                                presences: presences,
                                private_channels: dms,
                                read_state: [],
                                tutorial: tutorial,
                                user: user,
                                user_settings: {
                                    inline_embed_media: settings?.includes("INLINE_EMBED_MEDIA:1"),
                                    inline_attachment_media: settings?.includes("INLINE_ATTACHMENT_MEDIA:1"),
                                    render_embeds: settings?.includes("RENDER_EMBEDS:1"),
                                    enable_tts_command: settings?.includes("ENABLE_TTS_COMMAND:1"),
                                    theme: settings?.includes("THEME:DARK") ? "dark" : "light",
                                },
                                heartbeat_interval: heartbeat_interval // It seems that in 2015 discord, the heartbeat is sent over the READY event?
                            }
                        });
                    break;
                    case 1:
                        clearTimeout(socket.hbTimeout);

                        resetHB();

                        //socket.send(JSON.stringify({
                            //op: 11,
                            //d: packet.d
                        //}));

                        if (socket.user != null) {
                            logText(`Acknowledged client heartbeat from ${socket.user.id} (${socket.user.username}#${socket.user.discriminator})`, "GATEWAY");
                        }
                    break;
                    case 3:
                        let pUser = socket.user;

                        if (pUser != null && packet.d.idle_since == null && packet.d.game_id == null) {
                            await globalUtils.dispatchPresenceUpdate(pUser.id, "online", null)

                            await database.updatePresence(pUser.id, "online", null);
                        }
                        else if (pUser != null) {
                            await globalUtils.dispatchPresenceUpdate(pUser.id, "idle", null)

                            await database.updatePresence(pUser.id, "idle", null);
                        }
                    break;
                    case 4:
                        let guildId = packet.d.guild_id;
                        let channelId = packet.d.channel_id;
                        let selfMute = packet.d.self_mute;
                        let selfDeaf = packet.d.self_deaf;

                        gateway.send(socket, {
                            op: 0,
                            s: null,
                            t: "VOICE_STATE_UPDATE",
                            d: {
                                user_id: "1182227581244641281",
                                guild_id: guildId,
                                session_id: globalUtils.generateString(20),
                                channel_id: channelId,
                                mute: selfMute,
                                deaf: selfDeaf,
                                self_mute: selfMute,
                                self_deaf: selfDeaf,
                                suppress: false
                            }
                        });

                        gateway.send(socket, {
                            op: 0,
                            s: null,
                            t: "VOICE_SERVER_UPDATE",
                            d: {
                                guild_id: guildId,
                                endpoint: "127.0.0.1:1338",
                                token: globalUtils.generateString(20)
                            }
                        });
                    break;
                }
            });
        });
    },
    ready: (server: any) => {
        gateway.server = new WebSocket.Server({
            perMessageDeflate: false,
            server: server
        });

        gateway.handleEvents();
    },
    regularReady: (port: any) => {
        gateway.server = new WebSocket.Server({
            port: port
        });

        gateway.handleEvents();
    }
};

export default gateway;