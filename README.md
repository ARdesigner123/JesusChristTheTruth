# Jesus Christ The Truth

A website about Jesus Christ, the Gospel, the Bible, church history and false doctrines, with a community of believers: accounts, profiles, ranks, quests, quizzes, friends and chat, a discussion forum, testimonies and GuideBot.

Everything now lives in **this one repository**: a static website, deployed on **Vercel**, with **Supabase** as the only backend. The old Express server (`JesusBackend` on Render) is no longer needed.

```
Browser ──► Vercel (static HTML/CSS/JS) ──► Supabase (Postgres + RPC functions)
```

## What's inside

| Path | Purpose |
| --- | --- |
| `index.html` | Cinematic entry intro + login / register / guest portal |
| `main.html` | Home: hero, live stats, Prince of Peace, the 12 Gospel truths, Trinity, Holy Family, Twelve Apostles |
| `bible.html`, `genesis.html`, `church.html` | Bible canons, Genesis reader, church history & false doctrines |
| `topic.html` | Discussions (topics → responses → comments) and testimonies |
| `chatbot.html` | GuideBot, with saved conversations |
| `profile.html` | Profile, appearance editor, friends + chat, leaderboards, Quiz Arena |
| `quests.html`, `rank.html` | Daily/weekly/monthly quests, achievements, rank ladder |
| `static/css/theme.css` | Shared design system |
| `static/js/api.js` | Supabase client (RPC), sessions, shared helpers |
| `static/js/layout.js` | Shared navbar, sky background, transitions, presence and active-time tracking |
| `supabase/schema.sql` | **The whole backend**: tables, security and every server function |
| `scripts/write-config.js` | Vercel build step that writes your Supabase keys into `static/js/config.js` |

## 1. Set up Supabase (one time)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   - It works on your **existing** database. It keeps all your users, passwords, posts, friends and stats, and only adds missing tables or columns.
   - It is safe to run again whenever this file changes.
3. Go to **Project Settings → API Keys** and copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **anon / publishable** key.

> ⚠️ **Never use the `service_role` / secret key in the website.** Anyone can read files sent to a browser. The build refuses a secret key. If your old backend's `.env` (`SUPABASE_KEY`) was ever pushed to GitHub, rotate that key in Supabase.

### What the SQL changes about security

- **Row Level Security is switched on for every app table, with no policies.** The browser can no longer read or write tables directly; for example, password hashes can never be downloaded. Any old policies on these tables are removed.
- All features go through Postgres functions named `jct_*`. They check the caller's **session token**, so a user can only change their own data.
- Existing passwords (bcrypt `$2b$` hashes from the old Node server) keep working. New passwords use bcrypt via `pgcrypto`.
- The owner account (crown, moderation rights) is set in the table `jct_config`, under the key `owner_id`. It is already set to the owner UUID from the old server.

## 2. Deploy on Vercel

1. In Vercel, choose **Add New → Project**, then import this GitHub repository.
2. Framework preset: **Other**. Leave the build and output settings alone; `vercel.json` provides them.
3. Under **Environment Variables**, add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_ANON_KEY` = your anon / publishable key
4. Click **Deploy**. Your site is live at `https://<project>.vercel.app`.

To skip the environment variables, you can instead paste the two values into `static/js/config.js` and commit. The anon key is designed to be public.

After the site works on Vercel, you can delete the Render service and the `JesusBackend` repository.

## 3. Run locally

Any static file server works:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Fill in `static/js/config.js` first.

## Testing the database functions

[`supabase/tests/smoke_test.sql`](supabase/tests/smoke_test.sql) runs registration, login, time tracking, quests, friends, chat, quizzes, the forum, GuideBot, renaming and leaderboards. It also checks that tables are locked. **Run it only on a throwaway database**, because it creates test users:

```bash
psql "$TEST_DATABASE_URL" -f supabase/schema.sql -f supabase/tests/smoke_test.sql
```

## Behaviour changes from the old version

- **Daily streak**: it now resets if you miss a day. Previously it rose on every active day, even after a gap.
- **Daily Quiz**: once per day (Singapore time), now enforced by the server.
- **Active time**: only counted while the tab is visible and focused. The server also caps how much time one sync can add, so time can't be inflated.
- **Likes and favourites**: each person can now like or favourite a post only once (it toggles).
- **Monthly quests**: they now track real progress; the old version showed placeholder numbers.
- **Quests**: progress counts even if you haven't opened the Quests page yet that day.
- **Forum**: posts are cleaned of scripts before they are shown. Renaming your account keeps ownership of your old posts.
- **Leaderboard resets and top-3 rewards**: these run inside Supabase the first time anyone uses the site after the reset time, so there is no server to keep awake.
