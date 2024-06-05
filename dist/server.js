"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("./routes/auth"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const http_1 = require("http");
const logger_1 = require("./utils/logger");
const global_1 = __importDefault(require("./utils/global"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*'
}));
app.use((err, req, res, next) => {
    (0, logger_1.logText)(`[${req.method}] -> ${req.url}`, "debug");
    let token = req.headers['authorization'];
    if (!token || !global_1.default.checkToken(token)) {
        return res.status(401).json({
            code: 401,
            message: "Unauthorized"
        });
    }
    next();
});
app.use('/assets', express_1.default.static(__dirname + '/assets'));
app.use('/icons/', express_1.default.static(__dirname + '/user_assets/icons'));
app.use('/avatars/', express_1.default.static(__dirname + '/user_assets/avatars'));
app.use('/attachments/', express_1.default.static(__dirname + '/user_assets/attachments'));
app.use("/api/auth", auth_1.default);
app.get('/assets/:asset', (req, res) => {
    if (req.params.asset.includes(".map")) {
        return res.status(404).send("File not found");
    }
    return res.status(404).send("File not found");
});
app.get("/register", (req, res) => {
    res.send(fs_1.default.readFileSync('./assets/register.html', 'utf8'));
});
app.get("/login", (req, res) => {
    res.send(fs_1.default.readFileSync('./assets/login.html', 'utf8'));
});
//gateway.ready(server);
server.listen(1337, () => {
    console.log("[OldCord V2] (Reconnect to a better time) ONLINE!");
});
server.on('request', app);
