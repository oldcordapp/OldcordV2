import * as express from 'express';
import { Request, Response } from 'express';
import database from '../../utils/database';
import config from '../../utils/config';
import * as fs from 'fs';

const router = express.Router();

router.get("/statistics", async (req: any, res: any) => {
    let user_count = await database.getUserCount();
    let server_count = await database.getServerCount();
    let message_count = await database.getMessageCount();
    let new_users_today = await database.getNewUsersToday();
    let new_servers_today = await database.getNewServersToday();
    let new_messages_today = await database.getNewMessagesToday();

    return res.status(200).json({
        user_count: user_count,
        server_count: server_count,
        message_count: message_count,
        new_users_today: new_users_today,
        new_servers_today: new_servers_today,
        new_messages_today: new_messages_today
    })
});

router.get("/settings", async (req: any, res: any) => {
    let instance_flags: string[] = config.instance_flags;

    return res.status(200).json({
        token_secret: config.token_secret,
        gateway_url: config.gateway == "" ? "LOCATION IP" : config.gateway,
        base_url: config.base_url,
        port: config.port,
        use_wss: config.use_wss ? 'True' : 'False',
        local_deploy: config.local_deploy ? 'True' : 'False',
        cache_404s: config.cache404s ? 'True' : 'False',
        use_same_port: config.use_same_port ? 'True' : 'False',
        gateway_has_no_port: config.gateway_has_no_port ? 'True' : 'False',
        instance_flags: config.instance_flags,
        instance_name: config.instance_name.length < 3 ? "Oldcord instance" : config.instance_name,
        instance_description: config.instance_description.length < 3 ? "An oldcord instance" : config.instance_description,
        auto_join: instance_flags.includes("AUTOJOIN") ? instance_flags.filter(x => x.includes("AUTOJOIN"))[0].split(':')[1] : "NO GUILD ID",
        ws_port: config.ws_port == 0 ? "UNSPECIFIED" : config.ws_port,
        cert_path: config.cert_path == "" ? "UNSPECIFIED" : config.cert_path,
        key_path: config.key_path == "" ? "UNSPECIFIED" : config.key_path
    })
});

router.patch("/settings", async (req: any, res: any) => {
    let new_config = req.body;
    let instance_flag_str = ``;

    for(var flag of new_config.instance_flags) {
        instance_flag_str += "\"" + flag.toUpperCase() + "\"," + "\n"
    }

    let new_config_file = `const config = {
    token_secret: "${new_config.token_secret}",
    gateway: "${new_config.gateway_url}",
    use_wss: ${new_config.use_wss.toString().toLowerCase()},
    base_url: "${new_config.base_url}",
    local_deploy: ${new_config.local_deploy.toString().toLowerCase()},
    use_same_port: ${new_config.use_same_port.toString().toLowerCase()},
    port: ${new_config.port},
    cache404s: ${new_config.cache_404s.toString().toLowerCase()},
    gateway_has_no_port: ${new_config.gateway_has_no_port.toString().toLowerCase()},
    instance_name: "${new_config.instance_name}",
    instance_description: "${new_config.instance_description}",
    instance_flags: [
        ${instance_flag_str}
    ],
    cert_path: "${new_config.cert_path}",
    key_path: "${new_config.key_path}",
    ws_port: ${new_config.ws_port == "UNSPECIFIED" ? new_config.port : new_config.ws_port}
};
export default config;`;

    fs.writeFileSync(`./utils/config.ts`, new_config_file, "utf-8");
    
    return res.status(204).send();
});

export default router;