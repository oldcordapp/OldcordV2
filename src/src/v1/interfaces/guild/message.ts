import User from "../user";
import Attachment from '../guild/attachment'

interface Message {
    id: string;
    content: string;
    channel_id: string;
    author: User;
    attachments: Attachment[],
    embeds: [],
    mentions: User[] | [],
    nonce: string,
    timestamp: string;
    mention_everyone: boolean;
    edited_timestamp: string | null;
    tts: boolean;
}

export default Message;