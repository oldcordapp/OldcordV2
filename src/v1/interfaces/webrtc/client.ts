import User from "../user";
import { WebSocket } from "ws";

interface Client {
    token: string;
    socket: WebSocket;
    user: User;
    sequence: 0;
    lastHeartbeat: number;
}

export default Client;