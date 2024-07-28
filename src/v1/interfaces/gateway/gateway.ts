import Client from './client'
import { WebSocket } from "ws";

interface Gateway {
    server: any;
    port: any;
    clients: Client[];
    ready: (server: any) => void;
    regularReady: (port: any) => void;
    getSocket: (token: string) => WebSocket | null;
    handleEvents: () => void;
    send: (socket: WebSocket, data: any) => void;
    dispatchEventToAll: (data: any) => boolean;
    dispatchEventTo: (token: string, data: any) => boolean;
    dispatchEventToAllPerms: (guild_id: string, channel_id: string | null, permission_check: string, data: any) => Promise<boolean>;
    dispatchGuildMemberUpdateToAllTheirGuilds: (user_id: string) => Promise<boolean>;
    dispatchEventInGuild: (guild_id: string, data: any) => Promise<boolean>;
    dispatchEventInChannel: (channel_id: string, data: any) => Promise<boolean>;
    dispatchInDM: (sender_id: string, receiver_id: string, data: any) => Promise<boolean>;
}

export default Gateway;