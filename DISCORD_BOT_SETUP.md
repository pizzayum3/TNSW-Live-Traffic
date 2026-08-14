# Discord bot setup — Live Traffic NSW

This bot watches your Supabase `incidents` table and posts/edits/deletes a Discord embed for each one, live. It's a separate always-on process from the website — it needs somewhere to run continuously.

## 1. Add a bot to your Discord application
You already have a Discord application ("Live Traffic TNSW") from setting up sign-in — reuse it.
1. https://discord.com/developers/applications → your app → **Bot** (left sidebar).
2. If there's no bot user yet, click **Add Bot**.
3. Click **Reset Token** → copy it. This is your `DISCORD_TOKEN`. Treat it like a password.
4. Under **Privileged Gateway Intents**, you don't need to enable any of them — this bot only sends messages, it doesn't read them.

## 2. Invite the bot to your server
1. Same app → **OAuth2 → URL Generator**.
2. Scopes: check **bot**.
3. Bot Permissions: check **Send Messages**, **Embed Links**, **Attach Files**.
4. Copy the generated URL at the bottom, open it in your browser, pick your server, authorize.

## 3. Get the channel ID
1. In Discord, enable **Settings → Advanced → Developer Mode**.
2. Right-click the channel you want incidents posted in → **Copy Channel ID**. This is your `DISCORD_CHANNEL_ID`.

## 4. Get your Supabase service_role key
1. Supabase → **Project Settings → API**.
2. Copy the **service_role** secret (not the anon key you used on the website).
3. This key bypasses all your security rules — never put it in the website's `index.html`, never commit it to a public GitHub repo. It only goes in this bot's environment variables.

## 5. Run the migration
In Supabase → **SQL Editor**, run the whole `discord_bot_migration.sql` file once. It adds one small table the bot uses to remember which Discord message belongs to which incident.

## 6. Configure and test locally
1. In the `bot` folder: copy `.env.example` to `.env`.
2. Fill in the four values from steps 1–4.
3. `npm install` (dependencies are already included, but run this to be safe).
4. `npm start`.
5. You should see `Logged in as YourBot#1234` and `Supabase realtime status: SUBSCRIBED` in the terminal.
6. Go log a test incident on the website — it should appear in your Discord channel within a second or two. Resolve it, add an update, delete it — the same Discord message should update/disappear each time.

Run `node test/embeds.test.mjs` any time to check the embed-building logic itself still works — it doesn't need Discord or Supabase running.

## 7. Keep it running 24/7 (free options)
A Discord bot needs a persistent connection, so it has to run somewhere that doesn't sleep. Two free-tier-friendly options:

**Railway** (simplest)
1. https://railway.app → sign up → **New Project → Deploy from GitHub repo** (push this `bot` folder to its own small repo first).
2. In the project's **Variables** tab, add the same four values from your `.env`.
3. Railway deploys and keeps it running. Free usage credit covers a small bot like this comfortably for casual use.

**Fly.io** — similar idea, a bit more setup (a `Dockerfile`/`fly.toml`), but also has a free allowance for small always-on apps. Worth it if Railway's credits run out for you.

**Your own computer** works too if it's on most of the time — just less reliable if it restarts or loses power, since the bot needs to be running for incidents to post.

## If something breaks
Check the terminal/host logs first — errors are printed there (missing env vars, wrong channel ID, expired token, etc.). If you're stuck, paste the exact error back here.
