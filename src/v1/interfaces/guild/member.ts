import User from "../user";
import Role from "./role";

interface Member {
    id: string;
    nick: string | null;
    deaf: boolean;
    mute: boolean;
    roles: string[] | [];
    user: User;
}

export default Member;