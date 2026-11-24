// Badge themes. The look of each lives in app/globals.css as `.theme-<id>`.
// If you add one here, also add it to the badge_theme check in the database.
// Themes evoke a fandom's vibe with colors and patterns only: no logos or
// characters, since those belong to their owners.
export const BADGE_THEMES = [
  { id: "classic", name: "The CON Classic", greatFor: "Everyone" },
  { id: "blue-box", name: "Blue Box", greatFor: "Doctor Who, time travelers" },
  { id: "hunters-road", name: "Hunters' Road", greatFor: "Supernatural, monster hunters" },
  { id: "raid-night", name: "Raid Night", greatFor: "World of Warcraft, MMO guilds" },
  { id: "fursona", name: "Fursona", greatFor: "Furry fandom" },
  { id: "starship", name: "Starship Bridge", greatFor: "Star Trek, The Expanse, sci-fi" },
  { id: "grimoire", name: "Arcane Grimoire", greatFor: "D&D, fantasy, Critical Role" },
  { id: "neon-arcade", name: "Neon Arcade", greatFor: "Retro gaming, cyberpunk" },
  { id: "sakura", name: "Sakura", greatFor: "Anime and manga" },
  { id: "cape-cowl", name: "Cape & Cowl", greatFor: "Comics and superheroes" },
  { id: "haunted", name: "Haunted House", greatFor: "Horror, cryptids, the spooky crowd" },
] as const;

export type BadgeThemeId = (typeof BADGE_THEMES)[number]["id"];

export function isThemeId(value: string): value is BadgeThemeId {
  return BADGE_THEMES.some((t) => t.id === value);
}

export const LEVELS = [
  { value: 1, label: "Casual" },
  { value: 2, label: "Fan" },
  { value: 3, label: "Superfan" },
] as const;

export function levelLabel(level: number) {
  return LEVELS.find((l) => l.value === level)?.label ?? "Fan";
}
