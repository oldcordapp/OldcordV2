interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    email?: string;
    password?: string;
    token?: string;
    verified?: boolean;
    created_at?: string | null;
    settings?: string;
}

export default User;