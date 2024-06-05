import Guild from '../guild';
import User from '../user'
import Channel from './channel';

interface Invite {
    code: string;
    temporary?: boolean;
    revoked?: boolean;
    inviter: User;
    max_age?: number;
    max_uses?: number;
    uses?: number;
    xkcdpass?: boolean;
    guild: Guild;
    channel: Channel;
}

export default Invite;