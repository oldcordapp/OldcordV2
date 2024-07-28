import Channel from './guild/channel';
import Role from './guild/role';
import Member from './guild/member';
import Presence from './presence';
import VoiceState from './guild/voicestate';

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    owner_id: string;
    afk_channel_id?: string | null;
    afk_timeout?: number;
    channels?: Channel[] | [];
    region?: string;
    presences?: Presence[] | [];
    voice_states?: VoiceState[] | [],
    members?: Member[] | [],
    roles?: Role[] | [];
    joined_at?: string | undefined | null;
}

export default Guild;