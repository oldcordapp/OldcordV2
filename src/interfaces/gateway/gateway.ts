import Client from './client'
import { WebSocket } from "ws";
import ExtWebSocket from './extwebsocket';

interface Gateway {
    server: any;
    port: any;
    clients: Client[];
    ready: (server: any) => void;
    regularReady: (port: any) => void;
    getSocket: (token: string) => ExtWebSocket | null;
    handleEvents: () => void;
    send: (socket: ExtWebSocket, data: any) => void;
    dispatchEventToAll: (data: any) => boolean;
    dispatchEventTo: (token: string, data: any) => boolean;
    dispatchEventToPerms: (token: string, guild_id: string, channel_id: string | null, permission_check: string, data: any) => Promise<boolean>;
    dispatchEventToAllPerms: (guild_id: string, channel_id: string | null, permission_check: string, data: any) => Promise<boolean>;
    dispatchEventInGuild: (guild_id: string, data: any) => Promise<boolean>;
    dispatchEventInChannel: (channel_id: string, data: any) => Promise<boolean>;
    dispatchInDM: (sender_id: string, receiver_id: string, data: any) => Promise<boolean>;
}

export default Gateway;