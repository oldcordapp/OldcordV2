import Permission_Overwrite from './permission_overwrite';

interface Channel {
    type: string; //yeah back in 2015 they used strings for types (text = text, voice = voice channel lol)
    id: string;
    guild_id: string;
    last_message_id?: string;
    name: string;
    topic?: string | null;
    permission_overwrites?: Permission_Overwrite[] | []; //fuck no
    position?: number;
}

export default Channel;