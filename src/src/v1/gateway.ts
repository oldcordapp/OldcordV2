import Gateway from "./interfaces/gateway/gateway";
import * as WebSocket from "ws";
import { logText } from "./utils/logger";
import database from "./utils/database";
import globalUtils from "./utils/global";
import DMChannel from "./interfaces/dmchannel";
import Member from "./interfaces/guild/member";

const gateway: Gateway = {
    server: null,
    port: null,
    clients: [],
    dispatchEventToAll: (data: any) => {
        //console.log(`[DISPATCHER] -> ${JSON.stringify(data)}`);

        for(var client of gateway.clients) {
            gateway.send(client.socket, data);
        }

        //console.log(`[DISPATCH EVENT TO ALL] -> ${JSON.stringify(data)}`)

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

        //console.log(`[DISPATCH EVENT TO] -> ${JSON.stringify(data)}`)

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

        //console.log(`[DISPATCH EVENT IN DMS] -> ${JSON.stringify(data)}`)

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
                continue;
            }

            var socket = gateway.getSocket(account.token);

            if (socket == null) {
                continue;
            }

            const guildPermCheck = await globalUtils.hasGuildPermissionTo(guild.id, account.id, permission_check);

            if (checkChannel && channel != null) {
                const channelPermCheck = await globalUtils.hasChannelPermissionTo(channel, guild, account.id, permission_check);

                if (!guildPermCheck && !channelPermCheck) {
                    continue;
                } //else {
                    //await gateway.send(socket, data);
                    
                    //return true;
                //}
            }

            if (!guildPermCheck) {
                continue;
            }

            await gateway.send(socket, data);
        }

        return true;
    },
    dispatchGuildMemberUpdateToAllTheirGuilds: async (user_id: string) => {
        const user = await database.getAccountByUserId(user_id);

        if (user == null) {
            return false;
        }

        const guilds = await database.getUsersGuilds(user_id);

        if (guilds.length == 0) {
            return false;
        }

        let successCount = 0;

        for(var guild of guilds) {
            let member = await database.getGuildMemberById(guild.id, user.id);

            if (member == null) {
                continue;
            }

            //GUILD_MEMBER_UPDATE is so buggy here, lets try USER_UPDATE instead
            /*

            let attempt = await gateway.dispatchEventInGuild(guild.id, {
                op: 0,
                t: "GUILD_MEMBER_UPDATE",
                s: null,
                d: {
                    roles: member.roles,
                    user: member.user,
                    guild_id: guild.id
                }
            });
            */

            let attempt = await gateway.dispatchEventInGuild(guild.id, {
                op: 0,
                t: "USER_UPDATE",
                s: null,
                d: member.user
            })

            if (attempt) successCount++;
        }

        return successCount == guilds.length;
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
                continue;
            }

            var socket = gateway.getSocket(account.token);

            if (socket == null) {
                continue;
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

        const members: Member[] = await database.getGuildMembers(channel.guild_id);

        if (members.length == 0) {
            return false;
        }

        for(var member of members) {
            let permissions = await globalUtils.hasChannelPermissionTo(channel, guild, member.id, "READ_MESSAGES");

            if (!permissions) {
                continue;
            }

            let account = await database.getAccountByUserId(member.id);

            if (account == null || !account.token) {
                continue;
            }

            var socket = gateway.getSocket(account.token);

            if (socket == null) {
                continue;
            }

            await gateway.send(socket, data);
        }

        //console.log(`[DISPATCH EVENT IN CHANNEL] -> ${JSON.stringify(data)}`)

        return true;
    },
    send: (socket: WebSocket, data: any) => {
        logText(`Outgoing -> ${JSON.stringify(data)}`, "GATEWAY");

        socket.send(JSON.stringify(data));
    },
    handleEvents: () => {
        const server: WebSocket.Server = gateway.server as WebSocket.Server;
        const timeOutHandlers: any[] = [];

        server.on("listening", async () => {
            logText("Listening for connections", "GATEWAY")
        });

        server.on("connection", (socket: WebSocket) => {
            const HBINTERVAL = 45000;
            const HBTIMEOUT = HBINTERVAL + 20000;
            const HBEXTRA = HBINTERVAL - 30000;

            logText("New client connection", "GATEWAY")

            timeOutHandlers.push({
                hbTimeout: setTimeout(() => {}, HBINTERVAL + 99999),
                socket: socket
            })

            function resetHB(handler_passed: null | any) {
                let handler: any;

                if (handler_passed != null) handler = handler_passed;
                else handler = timeOutHandlers.filter(x => x.socket == socket)[0];

                if (handler == null) {
                    return;
                }

                handler.hbTimeout = setTimeout(() => {
                    socket.send(JSON.stringify({
                        op: 1,
                        d: null
                    }));

                    let cur_socket = gateway.clients.filter(x => x.socket == socket)[0];

                    if (cur_socket != null && cur_socket.user != null) {
                        logText(`Acknowledged client heartbeat from ${cur_socket.user.id} (${cur_socket.user.username}#${cur_socket.user.discriminator})`, "GATEWAY");
                    } 

                    handler.hbTimeout = setTimeout(async () => {
                        if (cur_socket != null && cur_socket.user != null) {
                            await globalUtils.dispatchPresenceUpdate(cur_socket.user.id, "offline", null);
                        }

                        socket.close(4009, 'Session timed out');

                        gateway.clients = gateway.clients.filter(client => client.socket !== socket);
                    }, HBEXTRA);
                }, HBTIMEOUT);
            }

            resetHB(null);

            socket.on("close", async () => {
                let handler = timeOutHandlers.filter(x => x.socket == socket)[0];

                if (handler == null) {
                    return;
                }

                let cur_socket = gateway.clients.filter(x => x.socket == socket)[0];

                if (cur_socket != null && cur_socket.user != null) {
                    await globalUtils.dispatchPresenceUpdate(cur_socket.user.id, "offline", null);

                    logText(`Client ${cur_socket.user.id} disconnected`, "GATEWAY");
        
                    gateway.clients = gateway.clients.filter(client => client.socket !== socket);
                }
        
                if (handler.hbTimeout) {
                    clearTimeout(handler.hbTimeout);
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
                            user: user,
                            presence: {
                                game: null,
                                status: 'online',
                                user: {
                                    avatar: user.avatar,
                                    discriminator: user.discriminator,
                                    id: user.id,
                                    username: user.username
                                }
                            }
                        });

                        const client = gateway.clients.filter(x => x.user.id == user?.id)[0];

                        const guilds = await database.getUsersGuilds(user.id);

                        let presences: any[] = [];
                        let read_states: any[] = [];

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

                            if (guild.channels) {
                                for(var channel of guild.channels) {
                                    let getLatestAcknowledgement = await database.getLatestAcknowledgement(user.id, channel.id);

                                    if (getLatestAcknowledgement) read_states.push(getLatestAcknowledgement)
                                }
                            }
                        }

                        let dms = await database.getDMChannels(user.id) as DMChannel[];
                        let dm_list: any[] = [];

                        for (const dm of dms) {
                            let closed = await database.isDMClosed(dm.id);

                            if (closed) {
                                dms = dms.filter(x => x.id !== dm.id);

                                continue;
                            }

                            if (dm.author_of_channel_id == user.id) {
                                dm_list.push({
                                    id: dm.id,
                                    name: "", //dm channels have no name lol
                                    topic: "", 
                                    position: 0,
                                    recipient: {
                                        id: dm.receiver_of_channel_id
                                    },
                                    type: "text",
                                    guild_id: null,
                                    is_private: true,
                                    permission_overwrites: []
                                })
                            } else {
                                dm_list.push({
                                    id: dm.id,
                                    name: "", //dm channels have no name lol
                                    topic: "", 
                                    position: 0,
                                    recipient: {
                                        id: dm.author_of_channel_id
                                    },
                                    type: "text",
                                    guild_id: null,
                                    is_private: true,
                                    permission_overwrites: []
                                })
                            }
                        }

                        client.sequence++;

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
                                private_channels: dm_list,
                                read_state: read_states,
                                tutorial: tutorial,
                                user: user,
                                user_settings: {
                                    inline_embed_media: settings?.includes("INLINE_EMBED_MEDIA:1"),
                                    inline_attachment_media: settings?.includes("INLINE_ATTACHMENT_MEDIA:1"),
                                    render_embeds: settings?.includes("RENDER_EMBEDS:1"),
                                    enable_tts_command: settings?.includes("ENABLE_TTS_COMMAND:1"),
                                    theme: settings?.includes("THEME:DARK") ? "dark" : "light",
                                },
                                user_guild_settings: [], //2015 december support
                                heartbeat_interval: heartbeat_interval // It seems that in 2015 discord, the heartbeat is sent over the READY event?
                            }
                        });

                        await globalUtils.dispatchPresenceUpdate(user.id, "online", null)
                    break;
                    case 1:
                        let handler2 = timeOutHandlers.filter(x => x.socket == socket)[0];

                        if (handler2 == null) {
                            return;
                        }

                        clearTimeout(handler2.hbTimeout);

                        resetHB(handler2);
                    break;
                    case 3:
                        let cur_socket = gateway.clients.filter(x => x.socket == socket)[0];

                        if (cur_socket != null && cur_socket.user) {
                            let pUser = cur_socket.user;

                            if (pUser != null && packet.d.idle_since == null && packet.d.game_id == null) {
                                await globalUtils.dispatchPresenceUpdate(pUser.id, "online", null);
    
                                let client = gateway.clients.filter(x => x.socket == socket)[0];
    
                                if (client != null) {
                                    client.presence = {
                                        game: null,
                                        status: 'online',
                                        user: {
                                            avatar: pUser.avatar,
                                            discriminator: pUser.discriminator,
                                            id: pUser.id,
                                            username: pUser.username
                                        }
                                    }
                                }
                            }
                            else if (pUser != null && packet.d.idle_since != null && packet.d.status == 'idle') {
                                await globalUtils.dispatchPresenceUpdate(pUser.id, "idle", null);
    
                                let client = gateway.clients.filter(x => x.socket == socket)[0];
    
                                if (client != null) {
                                    client.presence = {
                                        game: null,
                                        status: 'idle',
                                        user: {
                                            avatar: pUser.avatar,
                                            discriminator: pUser.discriminator,
                                            id: pUser.id,
                                            username: pUser.username
                                        }
                                    }
                                }
                            }
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