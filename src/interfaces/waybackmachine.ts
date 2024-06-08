import WaybackTimestamps from "./waybacktimestamps";

interface WaybackMachine {
    convertTimestampToCustomFormat: (timestamp) => string;
    getTimestamps: (url: string) => Promise<WaybackTimestamps | null>;
}

export default WaybackMachine;