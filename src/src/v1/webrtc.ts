import WebRTC from "./interfaces/webrtc/webrtc";
import * as WebSocket from "ws";
import { logText } from "./utils/logger";
import database from "./utils/database";
import globalUtils from "./utils/global";

const webrtc: WebRTC = {
    server: null,
    port: null,
    clients: [],
    send: (socket: WebSocket, data: any) => {
        logText(`Outgoing -> ${JSON.stringify(data)}`, "WEBRTC");

        socket.send(JSON.stringify(data));
    },
    handleEvents: () => {
        const server: WebSocket.Server = webrtc.server as WebSocket.Server;

        server.on('close', async (socket: WebSocket) => {
            logText("Client disconnected", "WEBRTC");
        });

        server.on("listening", () => {
            logText("Listening for connections", "WEBRTC")
        });

        server.on("connection", (socket: WebSocket) => {
            logText("New client connection", "WEBRTC")

            webrtc.send(socket, {
                op: 8,
                d: {
                    heartbeat_interval: (1000 * 45)
                }
            });

            socket.on("message", async (data: any) => {
                const msg = data.toString("utf-8");
                const packet = JSON.parse(msg);
    
                if (packet.op != 3) {
                    logText(`Incoming -> ${msg}`, "WEBRTC");
                }
    
                switch(packet.op) {
                    case 0:
                        webrtc.send(socket, {
                            op: 2,
                            d: {
                                ssrc: 1,
                                ip: "127.0.0.1",
                                port: 8000,
                                modes: "plain",
                            }
                        })
                    break;
                    case 1:
                        webrtc.send(socket, {
                            op: 4,
                            d: {
                                mode: "plain",
                                sdp: "v=0 o=- 0 0 IN IP4 127.0.0.1 s=- t=0 0 a=group:BUNDLE audio video m=audio 9 UDP/TLS/RTP/SAVPF 111 c=IN IP4 0.0.0.0 a=rtcp:9 IN IP4 0.0.0.0 a=ice-ufrag:randomIceUfrag a=ice-pwd:randomIcePwd a=ice-options:trickle a=fingerprint:sha-256 0F:7C:23:28:62:7A:26:0C:85:6A:02:7B:FC:51:84:EC:2A:A6:34:0C:81:9C:53:D8:7C:F3:DE:1E:05:3E:6E a=setup:actpass a=mid:audio a=sendrecv a=rtpmap:111 opus/48000/2 a=fmtp:111 minptime=10; useinbandfec=1 a=rtcp-mux m=video 9 UDP/TLS/RTP/SAVPF 120 c=IN IP4 0.0.0.0 a=rtcp:9 IN IP4 0.0.0.0 a=ice-ufrag:randomIceUfrag a=ice-pwd:randomIcePwd a=ice-options:trickle a=fingerprint:sha-256 0F:7C:23:28:62:7A:26:0C:85:6A:02:7B:FC:51:84:EC:2A:A6:34:0C:81:9C:53:D8:7C:F3:DE:1E:05:3E:6E a=setup:actpass a=mid:video a=sendrecv a=rtpmap:120 VP8/90000 a=rtcp-mux"
                            }
                        })
                    break;
                }
            });
        });
    },
    ready: (server: any) => {
        webrtc.server = new WebSocket.Server({
            perMessageDeflate: false,
            server: server
        });

        webrtc.handleEvents();
    },
    regularReady: (port: any) => {
        webrtc.server = new WebSocket.Server({
            port: port
        });

        webrtc.handleEvents();
    }
};

export default webrtc;