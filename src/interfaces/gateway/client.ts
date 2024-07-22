import User from "../user";
import { WebSocket } from "ws";
import ExtWebSocket from "./extwebsocket";

interface Client {
    token: string;
    socket: ExtWebSocket;
    user: User;
    sequence: 0;
}

export default Client;