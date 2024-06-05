export default class permissions {
    static readonly MANAGE_SERVER = 1 << 5;
    static readonly MANAGE_ROLES = 1 << 3;
    static readonly MANAGE_CHANNELS = 1 << 4;
    static readonly KICK_MEMBERS = 1 << 1;
    static readonly BAN_MEMBERS = 1 << 2;
    static readonly CREATE_INSTANT_INVITE = 1 << 0;
    static readonly READ_MESSAGES = 1 << 10;
    static readonly SEND_MESSAGES = 1 << 11;
    static readonly SEND_TTS_MESSAGES = 1 << 12;
    static readonly MANAGE_MESSAGES = 1 << 13;
    static readonly EMBED_LINKS = 1 << 14;
    static readonly ATTACH_FILES = 1 << 15;
    static readonly READ_MESSAGE_HISTORY = 1 << 16;
    static readonly MENTION_EVERYONE = 1 << 17;
    static readonly CONNECT = 1 << 20;
    static readonly SPEAK =  1<< 21;
    static readonly MUTE_MEMBERS = 1 << 22;
    static readonly DEAFEN_MEMBERS = 1 << 23;
    static readonly MOVE_MEMBERS = 1 << 24;
    static readonly USE_VOICE_ACTIVITY = 1 << 25;

	static has(compare: number, key: string) {
        return !!(BigInt(compare) & BigInt(permissions[key]));
    }
}