import WebSocket = require('ws');
import User from '../user';

interface ExtWebSocket extends WebSocket {
    hbTimeout?: NodeJS.Timeout;
    token?: string;
    sequence?: number;
    user?: User;
}

export default ExtWebSocket;