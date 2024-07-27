# OldcordV2
Current code for OldCord 2015 and whatnot, instructions on how to setup an instance coming soon. Rewrite also coming soon, yucky code.
2016, 2017 support is planned but currently a work in progress!!!
Fun fact: this is a rewrite of the original code already, in the original code 2016 was supported but not finished.

# Credits
Myself - literally 90% of the code <br />
Ziad from hummus for 10% of the code (Permissions handling & token stuff) - love you <br />
oh and discord.js devs for snowflake stuff <br />

# Setup
First you need a postgres server & db running on your server/machine, then you'd need to create a db_config.json file in the src directory with your db login information 

Like so:

```js
{
    "host": "localhost",
    "port": 5433,
    "database": "database",
    "user": "user",
    "password": "password"
}
```

```
Run npm install in the base directory
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

```
Then after changing the config and database configuration, you can go ahead and build and run the instance with build.bat
```

I use nginx as my reverse proxy on a web server which points to my VPS running the actual OldCord Instance, here's an example server block I used for staging_2015.oldcordapp.com

```

    server {
        listen 80;
        
        server_name staging_2015.oldcordapp.com www.staging_2015.oldcordapp.com;
        
        listen 443 ssl;
	      ssl_certificate /etc/nginx/fullchain2.pem;
	      ssl_certificate_key /etc/nginx/privkey2.pem;
	
	      if ($scheme != "https") {
        	  return 301 https://$host$request_uri;
    	  }
     
        location / {
            proxy_pass http://SERVERIP:OLDCORDPORT;
            proxy_set_header Host $host;
            client_max_body_size 100M;
            proxy_pass_request_headers on;
            add_header Last-Modified $date_gmt;
            add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Host $remote_addr;
            proxy_no_cache 1;
            proxy_cache_bypass 1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        location /gateway {
            proxy_pass http://SERVERIP:OLDCORDPORT;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        error_page 404 /404.html;
          location = /40x.html {
        }
    
        error_page 500 502 503 504 /50x.html;
          location = /50x.html {
        }
    }
```
