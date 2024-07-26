/*
const config = {
    token_secret: "35c8...",
    gateway: "",
    use_wss: false,
    base_url: "127.0.0.1",
    local_deploy: true,
    use_same_port: true,
    port: 1337,
    cache404s: false,
    gateway_has_no_port: false,
    instance_name: "2015 Staging",
    instance_description: "An oldcord instance",
    instance_flags: [
        "NO_FLAGS"
    ],
    cert_path: "",
    key_path: "",
    ws_port: 0
};
export default config;
*/

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
    instance_name: "2015 Staging",
    instance_description: "An oldcord instance",
    instance_flags: [
	"AUTOJOIN:1264743522297188359"
    ],
    cert_path: "", //if using wss, this needs to be specified
    key_path: "", //i got lazy
    ws_port: 0 //only need to specify if use_same_port is false 
};

export default config;