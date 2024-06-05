"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body.email) {
            return res.status(400).json({
                code: 400,
                email: "This field is required.",
            });
        }
        if (!req.body.username) {
            return res.status(400).json({
                code: 400,
                username: "This field is required.",
            });
        }
        if (!req.body.password) {
            return res.status(400).json({
                code: 400,
                password: "This field is required.",
            });
        }
        const registrationAttempt = yield database_1.default.createAccount(req.body.username, req.body.email, req.body.password);
        if ('reason' in registrationAttempt) {
            const error = registrationAttempt;
            return res.status(400).json({
                code: 400,
                email: error.reason
            });
        }
        else {
            const newaccount = registrationAttempt;
            return res.status(200).json({
                token: newaccount.token,
            });
        }
    }
    catch (error) {
        (0, logger_1.logText)(error.toString(), "error");
        return res.status(500).json({
            code: 500,
            message: "Internal Server Error"
        });
    }
}));
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body.email) {
        return res.status(400).json({
            code: 400,
            email: "This field is required.",
        });
    }
    if (!req.body.password) {
        return res.status(400).json({
            code: 400,
            password: "This field is required.",
        });
    }
    const loginAttempt = yield database_1.default.checkAccount(req.body.email, req.body.password);
    if ('reason' in loginAttempt) {
        const error = loginAttempt;
        return res.status(400).json({
            code: 400,
            email: error.reason,
            password: error.reason
        });
    }
    else {
        const account = loginAttempt;
        return res.status(200).json({
            token: account.token,
        });
    }
}));
router.post("/logout", (req, res) => {
    return res.status(204).send();
});
exports.default = router;
