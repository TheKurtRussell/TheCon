# The CON

*Where dating is a little unconventional.*

A dating app for the geek community: gamers, cosplayers, tabletop players, anime fans and superfans. People match on shared fandoms and break the ice by playing a game together.

**Status:** Phase 1. Landing page, sign-up with an 18+ check, log-in, log-out, and a protected home page.

## Tech

- [Next.js](https://nextjs.org) 15 (App Router, TypeScript)
- [Supabase](https://supabase.com) for login and the database
- [Vercel](https://vercel.com) for hosting
- Plain CSS in `app/globals.css` (the comic-convention look lives there)

## Go live (no coding needed)

1. **Supabase:** create a project. Open **Project Settings > API** and keep the tab open. You'll need the Project URL and the `anon` public key.
2. **Vercel:** choose **Add New > Project** and import this GitHub repo.
3. Before deploying, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your anon public key
4. Click **Deploy**. You'll get a link like `thecon.vercel.app`.
5. **Back in Supabase:** go to **Authentication > URL Configuration**. Set **Site URL** to your Vercel link, and add `https://YOUR-SITE.vercel.app/auth/callback` under **Redirect URLs**.
6. Visit your site, get a badge, and click the link in the confirmation email.

Every push to `main` redeploys automatically.

Never commit `.env.local` or paste keys into code or chat. Only the `anon` key belongs in the app. The `service_role` key must never go in this project.

## Run it on your computer (optional)

```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev                  # opens at http://localhost:3000
```

For local testing, also add `http://localhost:3000/auth/callback` to Supabase's Redirect URLs.

## Where things live

| Path | What it is |
| --- | --- |
| `app/page.tsx` | Landing page |
| `app/signup`, `app/login` | Sign-up (18+ check, code of conduct) and log-in |
| `app/home` | Logged-in home (profile setup comes in Phase 2) |
| `app/auth/actions.ts` | Sign-up, log-in and log-out logic |
| `app/auth/callback` | Where the confirmation email link lands |
| `lib/supabase/` | Supabase connection helpers |
| `middleware.ts` | Keeps sessions fresh and guards `/home` |
| `app/globals.css` | Colors, fonts and the comic-convention style |

## Roadmap

1. ~~Setup: login and deploy~~
2. Profiles: fandom tags, prompts, photos, identity options
3. Matching: shared-fandom score, Discover feed, matches
4. Icebreakers: fandom trivia duel, then D&D and board games
5. Safety + beta: block/report, moderation queue, code of conduct
