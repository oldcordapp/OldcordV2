import Client from './client'
import { WebSocket } from "ws";

interface WebRTC {
    server: any;
    port: any;
    clients: Client[];
    ready: (server: any) => void;
    regularReady: (port: any) => void;
    handleEvents: () => void;
    send: (socket: WebSocket, data: any) => void;
}

export default WebRTC;