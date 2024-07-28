import User from "./user";

interface Presence {
    game: string | null;
    status: string;
    user: User;
}

export default Presence;