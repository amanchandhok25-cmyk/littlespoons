# Little Spoons: our weaning tracker

A small self-hosted web app for tracking a baby's weaning journey, shared between two parents.
It installs on Android and iPhone from the browser (no app store), and runs on your own server with Docker.

> Meal suggestions and allergen guidance follow general NHS "Start for Life" / AAP-style advice.
> They are **not medical advice**. Check with your GP or health visitor, especially around nuts and eczema.

## What it does

| Area | Features |
|---|---|
| **Today** | Today's planned meals with "Log this meal" in one tap, what's been logged, milk feeds, what the other parent did, a daily tip |
| **Tomorrow (plan & prep)** | A run-through of tomorrow generated automatically every evening (default 19:00): breakfast, lunch, dinner, optional snack, new food(s) of the day, allergens due, what to watch for, a shared prep checklist for tonight, shopping check, notes to each other. Swap any meal, reshuffle, or pick the new food yourself |
| **Log** (+ button) | Foods eaten per meal, how much (refused / taste / some / most), and how he liked it (😖 😐 🙂 😍); milk feeds |
| **Foods** | ~110 foods with age-appropriate serving and choking-safety guidance, tries count, likes and dislikes, status (safe / watch / avoid), custom foods |
| **Health** | Reaction log (symptoms, suspected foods from the last 48h, onset, photo), eczema skin diary, allergen tracker, printable **GP summary** |
| **Progress** | 100-foods-before-1 ring, variety by food group, 14-day view, possible flare links, favourites, foods to keep re-offering, CSV/JSON export |
| **Notifications** | Tomorrow's plan each evening; a ping when the other parent logs a reaction, a first taste or a note (Android, and iPhone with iOS 16.4+ once installed) |

### How the planner thinks

* An iron-rich food at every meal; vitamin C pairings; age-based meal count (2 meals under 7 months, 3 from 7 months, optional snack).
* **One new non-allergen food a day** (staples like oats, banana, broccoli and lentils first). Configurable.
* **One new allergen at a time**, at breakfast, at least 3 days apart, in the NHS order (milk, egg, wheat, fish, soya, sesame, then nuts one by one, shellfish...).
* **Nuts are held back until you tick "GP has okayed nuts"** in Settings, because of his eczema.
* Once an allergen is tolerated it is kept in the diet: anything not eaten for 4 days is added back in.
* Foods linked to a moderate/severe reaction become "avoid" and are never planned; mild = "watch". Any new allergen is paused for 3 days after a reaction.
* Liked foods come up more; disliked ones are gently re-offered (babies can need 10 to 15 tries).
* Choking-safety prep (e.g. grapes quartered lengthways, cherry tomatoes quartered) is added to the prep list.

Already seeded: 32 weeks old (DOB 20 Mar 2026, change it in Settings), eczema, and chicken, sweet potato, tomatoes,
cucumber, green beans, spinach, egg and yoghurt as tried without problems.

## Run it on your server

Needs Docker with the Compose plugin.

```bash
cp .env.example .env
nano .env                 # set both passwords, his name, your domain
docker compose up -d --build
docker compose logs -f weaning
```

The app listens on `127.0.0.1:3080` on the server (change `APP_PORT` in `.env` if that port is taken). **To install it on an iPhone it must be served over HTTPS**
(Android also needs HTTPS for install and notifications). Pick one:

**Option A: your own domain + Caddy (automatic free HTTPS)**
1. Point a DNS A record (e.g. `spoons.yourdomain.com`) at your server's public IP.
2. Open ports 80 and 443 on your router/firewall.
3. Set `DOMAIN=spoons.yourdomain.com` in `.env`, then `docker compose --profile caddy up -d`.

**Option B: Cloudflare Tunnel (no open ports, works from home broadband)**
1. In Cloudflare Zero Trust, Networks, Tunnels, create a tunnel, add a public hostname pointing to `http://localhost:3080` (your `APP_PORT`).
2. Put the token in `TUNNEL_TOKEN` in `.env`, then `docker compose --profile tunnel up -d`.

**Option C: already have a reverse proxy** (Nginx Proxy Manager, Traefik, Synology, Unraid...): proxy your HTTPS hostname
to `APP_PORT` (default 3080) and pass `X-Forwarded-Proto`. Remove `127.0.0.1:` from the port mapping if the proxy is on another machine.

Logins come from `USERS` in `.env` the first time the app starts (format `username:Name:password`). If you leave a
password blank, a random one is printed in the logs. Each of you can change your password in Settings.

## Install on your phones

* **iPhone:** open the address in **Safari**, tap Share, then **Add to Home Screen**. Open it from the home screen,
  log in, and turn on notifications in Settings.
* **Android:** open it in **Chrome**, tap the menu, then **Install app**. Log in and turn on notifications in Settings.

Logins last a year, so you only sign in once per phone.

## Backups and updates

* All data lives in the `spoons_data` Docker volume (`/data/weaning.db`, SQLite).
  Backup: `docker compose cp weaning:/data/weaning.db ./backup-$(date +%F).db`
  You can also download a JSON backup or CSV from the Progress screen.
* Update after changing code: `docker compose up -d --build`.

## Running without Docker

Node.js 22.13 or newer: `npm install && USERS=aman:Aman:pw1,kiran:Kiran:pw2 npm start`. Data goes in `./data`.

## Ideas for later

Freezer inventory for batch cooking, a weekly plan view, growth/weight chart, recipe photos, nappy log.
