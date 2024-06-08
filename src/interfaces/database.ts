import User from './user';
import Guild from './guild';
import StandardError from './errors/standarderror'
import LoginResponse from './responses/loginresponse'
import Tutorial from './tutorial'
import Channel from './guild/channel'
import Member from './guild/member'
import Role from './guild/role'
import Presence from './presence'
import Message from './guild/message'
import UploadAttachment from './uploadattachment';
import Permission_Overwrite from './guild/permission_overwrite';
import Widget from './guild/widget'
import Invite from './guild/invite'
import Ban from './guild/ban';

interface Database {
    client: any;
    runQuery: (queryString: string, values?: any[]) => Promise<any | null>;
    setupDatabase: () => Promise<boolean>;
    getAccountByEmail: (email: string) => Promise<User | null>;
    getAccountByToken: (token: string) => Promise<User | null>;
    getAccountsByUsername: (username: string) => Promise<User[] | []>;
    getAccountByUserId: (id: string) => Promise<User | null>;
    getUserCount: () => Promise<number>;
    getServerCount: () => Promise<number>;
    getMessageCount: () => Promise<number>;
    getNewUsersToday: () => Promise<number>;
    getNewServersToday: () => Promise<number>;
    getNewMessagesToday: () => Promise<number>;
    getGuildById: (id: string) => Promise<Guild | null>;
    getMessageById: (id: string) => Promise<Message | null>;
    getChannelById: (id: string) => Promise<Channel | null>;
    getChannelMessages: (id: string) => Promise<Message[] | []>;
    getRoleById: (id: string) => Promise<Role | null>;
    getGuildWidget: (guild_id: string) => Promise<Widget | null>; 
    getGuildMembers: (id: string) => Promise<Member[] | []>;
    getInvite: (code: string) => Promise<Invite | null>;
    useInvite: (code: string, user_id: string) => Promise<boolean>;
    getChannelInvites: (channel_id: string) => Promise<Invite[] | []>;
    getGuildInvites: (guild_id: string) => Promise<Invite[] | []>;
    getGuildMemberById: (guild_id: string, id: string) => Promise<Member | null>;
    getGuildChannels: (id: string) => Promise<Channel[] | []>;
    getGuildPresences: (id: string) => Promise<Presence[] | []>;
    getChannelPermissionOverwrites: (channel_id: string) => Promise<Permission_Overwrite[] | []>;
    getGuildBans: (id: string) => Promise<Ban[] | []>;
    getGuildRoles: (id: string) => Promise<Role[] | []>;
    getUsersGuilds: (id: string) => Promise<Guild[] | []>;
    getTutorial: (user_id: string) => Promise<Tutorial | null>;
    closeDMChannel: (user_id: string, channel_id: string) => Promise<boolean>;
    isDMClosed: (user_id: string, channel_id: string) => Promise<boolean>;
    getClosedDMChannels: (user_id: string) => Promise<Channel[] | []>;
    updateTutorial: (user_id: string, indicators_suppressed: boolean, indicators_confirmed: string[]) => Promise<boolean>;
    updatePresence: (user_id: string, new_status: string, game: any | null) => Promise<boolean>;
    leaveGuild: (user_id: string, guild_id: string) => Promise<boolean>;
    joinGuild: (user_id: string, guild_id: string) => Promise<boolean>;
    deleteRole: (role_id: string) => Promise<boolean>;
    deleteChannel: (channel_id: string) => Promise<boolean>;
    updateChannel: (channel_id: string, channel: Channel) => Promise<boolean>;
    createChannel: (guild_id: string, name: string, type: string) => Promise<Channel | null>;
    createInvite: (guild_id: string, channel_id: string, inviter_id: string, temporary: boolean, maxUses: number, maxAge: number, xkcdpass: boolean, force_regenerate: boolean) => Promise<Invite | null>;
    createMessage: (guild_id: string | null, channel_id: string, author_id: string, content: string, nonce: string, attachment: UploadAttachment | null, tts: boolean) => Promise<Message | null>;
    deleteMessage: (message_id: string) => Promise<boolean>;
    updateGuild: (guild_id: string, afk_channel_id: string | null, afk_timeout: number, icon: string | null, name: string, region: string) => Promise<boolean>;
    deleteGuild: (guild_id: string) => Promise<boolean>;
    unbanMember: (guild_id: string, user_id: string) => Promise<boolean>;
    banMember: (guild_id: string, user_id: string) => Promise<boolean>;
    isBannedFromGuild: (guild_id: string, user_id: string) => Promise<boolean>;
    deleteInvite: (code: string) => Promise<boolean>;
    getDMChannels: (user_id: string) => Promise<Channel[] | []>;
    createDMChannel: (sender_id: string, recipient_id: string) => Promise<Channel | null>;
    clearRoles: (guild_id: string, member_id: string) => Promise<boolean>;
    createRole: (guild_id: string, name: string, permissions: number, position: number) => Promise<Role | null>;
    addRole: (guild_id: string, role_id: string, user_id: string) => Promise<boolean>;
    createGuild: (owner_id: string, icon: string | null, name: string, region: string | null) => Promise<Guild | null>;
    quickSetEveryoneOffline: () => Promise<boolean>;
    createAccount: (username: string, email: string, password: string) => Promise<LoginResponse | StandardError>;
    doesThisMatchPassword: (user_id: string, password: string) => Promise<boolean>;
    updateMessage: (message_id: string, new_content: string) => Promise<boolean>;
    updateRole: (role_id: string, name: string, permissions: number, position: number | null) => Promise<boolean>;
    updateGuildWidget: (guild_id: string, channel_id: string | null, enabled: boolean) => Promise<boolean>;
    updateChannelPermissionOverwrites: (channel_id: string, overwrites: Permission_Overwrite[]) => Promise<boolean>;
    deleteChannelPermissionOverwrite: (channel_id: string, overwrite: Permission_Overwrite) => Promise<boolean>;
    updateSettings: (user_id: string, new_settings: string) => Promise<boolean>;
    updateAccount: (avatar: string | null, email: string | null, username: string | null, password: string | null, new_password: string | null) => Promise<boolean>;
    checkAccount: (email: string, password: string) => Promise<LoginResponse | StandardError>;
}

export default Database;