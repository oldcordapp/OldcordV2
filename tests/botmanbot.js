const WebSocket = require('ws');
const request = require('request');

const instance = new WebSocket("ws://127.0.0.1:1337/")

instance.on('open', () => {
    console.log('Connected');

    instance.send(JSON.stringify({
        op: 2,
        d: {
            token: "MTE0Nzc0NTQ5MDY2Njg5NzQwOA.ZOBJOQ.0ZRekuHX5SJVTeXoavL4DDZGJwd3mbcvo6WpRw",
            properties: {
                $browser: "Discord Android",
                $device: "Linux",
                $os: "Android",
                $referrer: "http://127.0.0.1:1337/selector",
                $referring_domain: "127.0.0.1:1337"
            }
        }
    }));
});

async function say(channel_id, msg) {
    request.post(`http://127.0.0.1:1337/api/channels/${channel_id}/messages`, {
        headers: {
            'Authorization' : "MTE0Nzc0NTQ5MDY2Njg5NzQwOA.ZOBJOQ.0ZRekuHX5SJVTeXoavL4DDZGJwd3mbcvo6WpRw"
        },
        json: true,
        body: {
            content: msg,
            mentions: [],
            nonce: null,
            tts: false
        }
    }, (err, res, body) => {
        console.log(body);
    });
}

instance.on('message', async (message) => {
    const data = Buffer.from(message).toString('utf-8')
    const json = JSON.parse(data);

    if (json.op == 0 && json.heartbeat_interval) {
        console.log("[LOG] Got heartbeat interval")

        setInterval(() => {
            instance.send(JSON.stringify({
                op: 1,
                d: Date.now()
            }))
        }, json.d.heartbeat_interval)
    } else if (json.op == 0 && json.t) {
        let type = json.t;

        if (type == 'READY') {
            console.log(`[LOG] In ${json.d.guilds.length} guild(s)!`);
        } else if (type == 'MESSAGE_CREATE') {
            if (json.d.author.id != 1147745490666897408) {
                console.log(`[LOG] New Message from ${json.d.author.username}#${json.d.author.discriminator}: ${json.d.content}`)

                if (!json.d.content.startsWith("!")) {
                    return;
                }

                let arguments = json.d.content.split(' ');

                if (json.d.content == '!wow') {
                    await say(json.d.channel_id, "hi");
                }
            }
        }
    }
})