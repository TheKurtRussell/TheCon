# The CON

*Where dating is a little unconventional.*

A dating app for the geek community: gamers, cosplayers, tabletop players, anime fans and superfans. People match on shared fandoms and break the ice by playing a game together.

**Status:** Phase 3. Profiles with themed badges, plus matching: a Discover feed ranked by shared fandoms, likes, matches, and block/report.

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
6. Still in Supabase, open **Authentication > Emails > Confirm signup**. Replace `{{ .ConfirmationURL }}` with `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` so the email link works on any device or browser.
7. **Set up the profile tables (Phase 2):** in Supabase, open **SQL Editor > New query**, paste everything from `supabase/phase2_profiles.sql`, and click **Run**. This creates the tables, the fandom list, the photo storage and the security rules. It's safe to run again.
8. **Set up matching (Phase 3):** run `supabase/phase3_matching.sql` the same way.
9. Visit your site, get a badge, and click the link in the confirmation email.

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
| `app/home` | Sends you to your badge, or to make one if you're new |
| `app/profile` | Your badge page, plus `edit/` for the profile editor |
| `components/Badge.tsx` | The themed convention badge |
| `components/FandomPicker.tsx` | Category, fandom and fan-level dropdowns |
| `components/PhotoManager.tsx` | Photo upload and removal |
| `lib/themes.ts` | Badge theme list and fan levels |
| `app/discover` | Discover feed (one profile at a time) plus like/pass/block/report actions |
| `app/matches`, `app/people/[id]` | Your matches and a match's full profile |
| `components/ProfileView.tsx` | Badge + About layout used on every profile page |
| `components/SafetyMenu.tsx` | Block and report menu |
| `supabase/*.sql` | Database scripts to run in the Supabase SQL Editor |
| `app/auth/actions.ts` | Sign-up, log-in and log-out logic |
| `app/auth/callback` | Where the confirmation email link lands |
| `lib/supabase/` | Supabase connection helpers |
| `middleware.ts` | Keeps sessions fresh and guards `/home` |
| `app/globals.css` | Colors, fonts and the comic-convention style |

## Adding fandoms or badge themes

- **New fandom:** in the Supabase SQL Editor, run
  `insert into fandoms (name, category, sort) values ('Your Fandom', 'TV & Film', 99);`
  Use an existing category name, or a new one to create a new dropdown group.
- **New badge theme:** add it to `lib/themes.ts`, add a `.theme-<id>` block in `app/globals.css`, and add the id to the `badge_theme` check in the database.

## Roadmap

1. ~~Setup: login and deploy~~
2. ~~Profiles: fandom picker, badge themes, about-me fields, photos~~
3. ~~Matching: shared-fandom score, Discover feed, matches, block/report~~
4. Icebreakers: fandom trivia duel, then D&D and board games
5. Safety + beta: moderation queue, code of conduct page, ID + selfie age verification through a provider (e.g. Stripe Identity, Persona, Veriff, Yoti). Never store ID images ourselves.
