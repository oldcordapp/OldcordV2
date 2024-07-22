import User from "../user";
import { WebSocket } from "ws";
import Presence from "../presence";

interface Client {
    token: string;
    socket: WebSocket;
    user: User;
    sequence: number;
    presence: Presence;
}

export default Client;