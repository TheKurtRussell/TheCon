import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { levelLabel } from "@/lib/themes";
import AppHeader from "@/components/AppHeader";
import Badge, { type BadgeFandom } from "@/components/Badge";

const ABOUT_FIELDS: { key: string; label: string }[] = [
  { key: "looking_for", label: "Looking for" },
  { key: "con_weekend", label: "My ideal con weekend" },
  { key: "current_cosplay", label: "Current cosplay / WIP" },
  { key: "play_style", label: "How I play" },
  { key: "alignment", label: "D&D alignment" },
  { key: "hyperfixation", label: "Current hyperfixation" },
  { key: "hill_to_die_on", label: "The fandom hill I'll die on" },
];

export default async function MyBadgePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { saved } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/profile/edit");

  const [{ data: picked }, { data: photos }, { data: age }] = await Promise.all([
    supabase.from("profile_fandoms").select("level, fandoms(name)").eq("profile_id", user.id),
    supabase.from("photos").select("path").eq("profile_id", user.id).order("position").order("created_at").limit(1),
    supabase.rpc("profile_age", { pid: user.id }),
  ]);

  const fandoms: BadgeFandom[] = (picked ?? [])
    .map((row) => {
      const f = row.fandoms as unknown as { name: string } | { name: string }[] | null;
      const name = Array.isArray(f) ? f[0]?.name : f?.name;
      return name ? { name, level: Number(row.level) } : null;
    })
    .filter((x): x is BadgeFandom => x !== null)
    .sort((a, b) => b.level - a.level);

  let photoUrl: string | null = null;
  if (photos && photos[0]) {
    const { data } = await supabase.storage.from("photos").createSignedUrl(String(photos[0].path), 60 * 60);
    photoUrl = data?.signedUrl ?? null;
  }

  const p = profile as Record<string, string | null>;

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "48px 0 80px" }}>
        <div className="wrap">
          {saved && (
            <p className="alert" role="status" style={{ maxWidth: 560 }}>
              Badge saved! This is how other members will see you.
            </p>
          )}
          <div className="profile-layout">
            <div className="profile-badge">
              <Badge
                theme={p.badge_theme ?? "classic"}
                name={p.display_name ?? "You"}
                age={typeof age === "number" ? age : null}
                pronouns={p.pronouns}
                city={p.city}
                fandoms={fandoms}
                photoUrl={photoUrl}
              />
              <Link href="/profile/edit" className="btn" style={{ marginTop: 48 }}>
                Edit my badge
              </Link>
            </div>

            <div className="profile-about">
              {p.bio && (
                <div className="card">
                  <h2 className="legend">About me</h2>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, whiteSpace: "pre-line" }}>{p.bio}</p>
                </div>
              )}

              {fandoms.length > 0 && (
                <div className="card">
                  <h2 className="legend">Fandoms</h2>
                  <ul className="fandom-list">
                    {fandoms.map((f) => (
                      <li key={f.name}>
                        <strong>{f.name}</strong> <span className="level">{levelLabel(f.level)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card">
                <dl className="about-list">
                  {ABOUT_FIELDS.filter((f) => p[f.key]).map((f) => (
                    <div key={f.key}>
                      <dt>{f.label}</dt>
                      <dd>{p[f.key]}</dd>
                    </div>
                  ))}
                  {p.gender_identity && (
                    <div>
                      <dt>Gender identity</dt>
                      <dd>{p.gender_identity}</dd>
                    </div>
                  )}
                </dl>
                {ABOUT_FIELDS.every((f) => !p[f.key]) && !p.gender_identity && (
                  <p className="hint" style={{ margin: 0 }}>
                    Add a few &ldquo;About me&rdquo; answers so matches have something to talk about.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
