interface VoiceState {
    user_id: string;
    id: string; //guild id
    session_id: string;
    channel_id: string;
    mute: boolean;
    deaf: boolean;
    self_mute: boolean;
    self_deaf: boolean;
    suppress: boolean;
}

export default VoiceState;