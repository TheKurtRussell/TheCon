"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isThemeId } from "@/lib/themes";

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

function back(message: string): never {
  redirect(`/profile/edit?error=${encodeURIComponent(message)}`);
}

// Trims a text field, cuts it to the max length, and turns blanks into null.
function text(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) ?? "").trim().slice(0, max);
  return value === "" ? null : value;
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = text(formData, "display_name", 40);
  if (!displayName) back("Please add the name you want on your badge.");

  const theme = String(formData.get("badge_theme") ?? "classic");
  const alignment = text(formData, "alignment", 20);

  const profile = {
    id: user.id,
    display_name: displayName,
    pronouns: text(formData, "pronouns", 40),
    gender_identity: text(formData, "gender_identity", 60),
    looking_for: text(formData, "looking_for", 120),
    city: text(formData, "city", 60),
    bio: text(formData, "bio", 600),
    con_weekend: text(formData, "con_weekend", 200),
    current_cosplay: text(formData, "current_cosplay", 120),
    play_style: text(formData, "play_style", 120),
    alignment: alignment && ALIGNMENTS.includes(alignment) ? alignment : null,
    hill_to_die_on: text(formData, "hill_to_die_on", 200),
    hyperfixation: text(formData, "hyperfixation", 120),
    badge_theme: isThemeId(theme) ? theme : "classic",
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profile);
  if (profileError) back(`Couldn't save your badge: ${profileError.message}`);

  // Copy the birthdate from sign-up into the private table (only the owner can read it).
  const birthdate = user.user_metadata?.birthdate;
  if (typeof birthdate === "string" && birthdate) {
    await supabase.from("profile_private").upsert({ id: user.id, birthdate });
  }

  // Replace the fandom list with what's on the form ("fandomId:level").
  const seen = new Set<number>();
  const fandoms = formData
    .getAll("fandoms")
    .map((v) => String(v).split(":").map(Number))
    .filter(([id, level]) => Number.isInteger(id) && id > 0 && level >= 1 && level <= 3)
    .filter(([id]) => (seen.has(id) ? false : (seen.add(id), true)))
    .slice(0, 20)
    .map(([id, level]) => ({ profile_id: user.id, fandom_id: id, level }));

  const { error: clearError } = await supabase.from("profile_fandoms").delete().eq("profile_id", user.id);
  if (clearError) back(`Couldn't save your fandoms: ${clearError.message}`);
  if (fandoms.length > 0) {
    const { error: fandomError } = await supabase.from("profile_fandoms").insert(fandoms);
    if (fandomError) back(`Couldn't save your fandoms: ${fandomError.message}`);
  }

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
