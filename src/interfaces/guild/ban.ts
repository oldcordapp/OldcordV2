import User from "../user";

interface Ban {
    user: {
        username: string;
        id: string;
        avatar: string | null;
        discriminator: string; 
    }
}

export default Ban;