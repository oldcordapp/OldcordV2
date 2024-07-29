interface DMChannel {
    id: string;
    last_message_id?: string;
    author_of_channel_id: string;
    receiver_of_channel_id: string | null;
    is_closed: boolean;
}

export default DMChannel;