# The CON: notes for AI coding sessions

"The CON: Where dating is a little unconventional" is a dating web app for the geek community (cosplayers, gamers, tabletop players, anime fans, superfans). People match on shared fandoms, then break the ice by playing a short game together.

The owner is a beginner vibe coder. Explain changes in plain language, keep code simple, build one small piece at a time, and say exactly how to test it.

## Stack
- Next.js 15 App Router + TypeScript, React 19
- Supabase (`@supabase/ssr`) for login, Postgres and storage. Turn on Row Level Security for every table.
- Vercel hosting; pushes to `main` deploy
- Plain CSS in `app/globals.css`, with tokens as CSS variables. No Tailwind.

## Look
Comic-book convention style: thick `--ink` outlines, hard offset shadows, halftone `.dots`, Bangers display font, Inter body.
Palette: ink #121212, paper #FFF6E5, red #D7263D, yellow #FFC914, blue #1B4DFF.
Don't copy Comic-Con's or any other real convention's logo or branding.

## Database changes
Put each change in a new `supabase/phaseN_*.sql` that's safe to re-run. The owner pastes it into the Supabase SQL Editor.

## Rules that matter
- 18+ only. Keep birthdate private and show age only.
- Never commit secrets. Use `.env.local` and Vercel env vars. Never use the `service_role` key in the app.
- Identity fields (pronouns, gender) are free text with suggestions, never forced binary choices.
- Block must hide people both ways everywhere. Reports go to a moderation queue.
- Show location as city only.

## Phases
1. Setup (done): auth, landing page, protected /home
2. Profiles (done): supabase/phase2_profiles.sql. profiles (public fields + badge_theme), profile_private (birthdate, owner-only; others get age via profile_age()), fandoms (seeded, by category), profile_fandoms (level 1-3), photos (private 'photos' bucket, folder = user id, signed URLs). Badge themes are in lib/themes.ts plus `.theme-<id>` in globals.css plus the DB check constraint. Keep all three in sync. Themes use colors and patterns only, never logos or characters.
3. Matching: score = sum over shared fandoms of the lower of the two levels (1/2/3), plus 1 per shared category. Likes table; a match is a mutual like.
4. Icebreakers: fandom trivia duel; link out to Roll20 and board game sites for now
5. Safety + beta: blocks_reports, admin mod queue, code of conduct page
