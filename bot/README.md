# 🤖 CSA Telegram Bot — Setup Guide

## Prerequisites

- [Node.js](https://nodejs.org/) installed
- Cloudflare account (free): https://dash.cloudflare.com
- Telegram Bot API key (from @BotFather)
- Your Telegram user ID (for admin access)

---

## Step 1: Install Dependencies

```bash
cd bot
npm install
```

## Step 2: Get Your Telegram User ID

1. Open Telegram
2. Message [@userinfobot](https://t.me/userinfobot)
3. It will reply with your numeric user ID (e.g., `123456789`)
4. Note this down — you'll need it for admin access

## Step 3: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. ⚙️ Project Settings → Service Accounts
4. Click **Generate new private key**
5. Save the JSON file — you'll paste its contents in Step 6

## Step 4: Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser to authenticate with Cloudflare.

## Step 5: Update Configuration

Edit `wrangler.toml`:

```toml
[vars]
FIREBASE_PROJECT_ID = "your-actual-project-id"   # From Firebase Console → Project Settings
ADMIN_TELEGRAM_IDS = "your-telegram-user-id"       # From Step 2 (just the number)
PASS_THRESHOLD = "70"
```

## Step 6: Set Secrets (API keys — NOT in code)

```bash
# Set your Telegram bot token
npx wrangler secret put BOT_TOKEN
# Paste: your-123456:ABC-DEF... (from @BotFather)

# Set Firebase service account key
npx wrangler secret put FIREBASE_SA_KEY
# Paste the ENTIRE contents of the JSON file from Step 3

# Set NVIDIA API key (for AI chat)
npx wrangler secret put NVIDIA_API_KEY
# Paste your NVIDIA NIM API key
```

## Step 7: Deploy

```bash
npx wrangler deploy
```

You'll see output like:
```
Worker uploaded: csa-telegram-bot (https://csa-telegram-bot.YOUR_SUBDOMAIN.workers.dev)
```

**Copy that URL!**

## Step 8: Set Telegram Webhook

Tell Telegram to send updates to your worker:

```bash
# Replace YOUR_TOKEN and YOUR_WORKER_URL
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://YOUR_WORKER_URL"
```

Or visit this URL in browser:
```
https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://YOUR_WORKER_URL
```

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

## Step 9: Test!

1. Open your bot in Telegram
2. Send `/start`
3. It should welcome you and show the menu!

---

## 📱 Commands

| Command | Who | What it does |
|---------|-----|-------------|
| `/start` | Everyone | Welcome + main menu |
| `/day` | Everyone | Show today's links |
| `/test` | Everyone | Take periodic test (7/15 day) |
| `/admin` | Admin only | Admin panel |
| `/addlinks DAY` | Admin only | Add links to a day |
| `/addquiz DAY` | Admin only | Add quiz questions |

## 🔧 Updating the Bot

After any code changes:

```bash
npx wrangler deploy
```

Webhook stays set — no need to redo Step 8.

## 🔍 View Logs

```bash
npx wrangler tail
```

## ❓ Troubleshooting

**Bot doesn't respond:**
- Check webhook: `https://api.telegram.org/botTOKEN/getWebhookInfo`
- Check logs: `npx wrangler tail`

**"Access denied" for admin:**
- Make sure your Telegram user ID is in `wrangler.toml` under `ADMIN_TELEGRAM_IDS`
- Message @userinfobot to get your ID

**AI not working:**
- Check NVIDIA API key: `npx wrangler secret put NVIDIA_API_KEY`
- Check logs for error messages

---

## Architecture

```
Telegram User
    ↓
Cloudflare Worker (this bot)
    ↓ reads/writes
Firebase Firestore (shared with web app)
    ↑ reads/writes
Vercel (student web + admin panel)
```

Both the Telegram bot and the Vercel web app read from the **same Firestore** — when you add links in the web admin panel, they appear in the bot too!
