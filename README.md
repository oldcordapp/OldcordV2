# OldcordV2
Current code for OldCord 2015 and whatnot, instructions on how to setup an instance coming soon. Rewrite also coming soon, yucky code.
2016, 2017 support is planned but currently a work in progress!!!
Fun fact: this is a rewrite of the original code already, in the original code 2016 was supported but not finished.
# Dont ask for WebRTC as it most likely will never be finished, my brain too small for that

# Credits
Myself - literally 90% of the code
Ziad from hummus for 10% of the code (Permissions handling & token stuff) - love you
oh and discord.js devs for snowflake stuff

# Setup
First you need a postgres server & db running on your server/machine, then you'd need to replace the user, password and database name + host/port if required in /utils/database.ts

Like so:

```js
const configuration = {
    host: 'localhost',
    port: 5433,
    database: 'oldcord_2015',
    user: 'postgres',
    password: 'passwordhere'
}
```

For deployment on a live production server!!! You'd need to modify /utils/config.ts to match something like this as well:

```js
const config = {
    token_secret: "35c8...",
    gateway: "", //Leave as blank for it to use the location ip (if one)
    use_wss: true,
    base_url: 'staging_2015.oldcordapp.com',
    local_deploy: false,
    use_same_port: true,
    port: 1337,
    cache404s: false,
    gateway_has_no_port: true,
    instance_flags: [
        //"NO_REGISTRATION",
        //"NO_GUILD_CREATION",
        //"NO_INVITE_USE",
        //"NO_INVITE_CREATION",
        //"AUTOJOIN:1185874676694446081"
        "NO_FLAGS"
    ],
    cert_path: "", //if using wss, this needs to be specified
    key_path: "", //i got lazy
    ws_port: 0 //only need to specify if use_same_port is false 
};

export default config;
```