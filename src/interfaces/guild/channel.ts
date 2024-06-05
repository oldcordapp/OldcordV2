import Recipient from '../recipient'
import Permission_Overwrite from './permission_overwrite';

interface Channel {
    type: string; //yeah back in 2015 they used strings for types (text = text, voice = voice channel lol)
    id: string;
    guild_id?: string; //if it's a dm i dont think this is used?
    last_message_id?: string;
    name: string;
    topic?: string | null;
    recipient?: Recipient | null;
    permission_overwrites?: Permission_Overwrite[] | []; //fuck no
    position?: number;
    is_private?: boolean; //dm or not basically
}

export default Channel;