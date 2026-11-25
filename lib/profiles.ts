import type { BadgeFandom } from "@/components/Badge";

// The Supabase server client (kept loose so this file stays simple).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export type ProfileRecord = Record<string, string | null>;

export type ProfileViewData = {
  id: string;
  profile: ProfileRecord;
  fandoms: BadgeFandom[];
  photoUrl: string | null;
  age: number | null;
  verified: boolean;
};

// Turns a private photo path into a link that works for an hour.
export async function signedPhotoUrl(supabase: Client, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("photos").createSignedUrl(String(path), 60 * 60);
  return (data?.signedUrl as string | undefined) ?? null;
}

// Loads everything needed to show someone's badge and About section.
// Returns null if the profile doesn't exist or is hidden (for example, blocked).
export async function loadProfileView(supabase: Client, id: string): Promise<ProfileViewData | null> {
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;

  const [{ data: picked }, { data: photos }, { data: age }, { data: verification }] = await Promise.all([
    supabase.from("profile_fandoms").select("level, fandoms(name)").eq("profile_id", id),
    supabase.from("photos").select("path").eq("profile_id", id).order("position").order("created_at").limit(1),
    supabase.rpc("profile_age", { pid: id }),
    supabase.from("verifications").select("user_id").eq("user_id", id).maybeSingle(),
  ]);

  const fandoms: BadgeFandom[] = ((picked ?? []) as { level: number; fandoms: unknown }[])
    .map((row) => {
      const f = row.fandoms as { name: string } | { name: string }[] | null;
      const name = Array.isArray(f) ? f[0]?.name : f?.name;
      return name ? { name, level: Number(row.level) } : null;
    })
    .filter((x): x is BadgeFandom => x !== null)
    .sort((a, b) => b.level - a.level);

  return {
    id,
    profile: profile as ProfileRecord,
    fandoms,
    photoUrl: await signedPhotoUrl(supabase, photos?.[0]?.path),
    age: typeof age === "number" ? age : null,
    verified: Boolean(verification),
  };
}
