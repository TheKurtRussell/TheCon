import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { BADGE_THEMES } from "@/lib/themes";
import AppHeader from "@/components/AppHeader";
import FandomPicker from "@/components/FandomPicker";
import PhotoManager from "@/components/PhotoManager";
import { saveProfile } from "../actions";

const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they", "any pronouns", "ask me"];
const GENDERS = ["Woman", "Man", "Non-binary", "Genderfluid", "Agender", "Trans woman", "Trans man", "Two-spirit", "Questioning"];
const LOOKING_FOR = ["Player two (something serious)", "Dating, see where it goes", "Friends first", "Con buddy", "Still figuring it out"];
const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: fandoms, error: fandomsError }, { data: mine }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("fandoms").select("id, name, category").order("category").order("sort"),
    supabase.from("profile_fandoms").select("fandom_id, level").eq("profile_id", user.id),
    supabase.from("photos").select("id, path").eq("profile_id", user.id).order("position").order("created_at"),
  ]);

  // Photos are private, so we make short-lived links to show them.
  let photoList: { id: string; path: string; url: string | null }[] = [];
  if (photos && photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from("photos")
      .createSignedUrls(photos.map((p) => String(p.path)), 60 * 60);
    photoList = photos.map((p, i) => ({
      id: String(p.id),
      path: String(p.path),
      url: signed?.[i]?.signedUrl ?? null,
    }));
  }

  const p = profile ?? {};
  const v = (key: string) => ((p as Record<string, unknown>)[key] as string | null) ?? "";
  const currentTheme = v("badge_theme") || "classic";
  const dbProblem = fandomsError?.message ?? null;

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "48px 0 80px" }}>
        <div className="wrap edit-wrap">
          <h1 className="h2">{profile ? "Edit your badge" : "Make your badge"}</h1>

          {dbProblem && (
            <p className="alert" role="alert">
              The app can&rsquo;t read the profile tables yet ({dbProblem}). Make sure you&rsquo;ve run{" "}
              <code>supabase/phase2_profiles.sql</code> and <code>supabase/phase2b_grants.sql</code> in the Supabase SQL Editor.
            </p>
          )}
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <form action={saveProfile} className="edit-form">
            <fieldset className="card">
              <legend className="legend">The basics</legend>
              <div className="field-grid">
                <label className="field">
                  Badge name *
                  <input name="display_name" defaultValue={v("display_name")} maxLength={40} required />
                </label>
                <label className="field">
                  Pronouns
                  <input name="pronouns" list="pronoun-list" defaultValue={v("pronouns")} maxLength={40} />
                </label>
                <label className="field">
                  Gender identity
                  <input name="gender_identity" list="gender-list" defaultValue={v("gender_identity")} maxLength={60} />
                </label>
                <label className="field">
                  City
                  <input name="city" defaultValue={v("city")} maxLength={60} placeholder="Orlando, FL" />
                </label>
                <label className="field field-wide">
                  What I&rsquo;m looking for
                  <input name="looking_for" list="looking-list" defaultValue={v("looking_for")} maxLength={120} />
                </label>
              </div>
              <p className="hint">Type your own words, or pick a suggestion. Only your city is shown, never your exact location.</p>
              <datalist id="pronoun-list">{PRONOUNS.map((x) => <option key={x} value={x} />)}</datalist>
              <datalist id="gender-list">{GENDERS.map((x) => <option key={x} value={x} />)}</datalist>
              <datalist id="looking-list">{LOOKING_FOR.map((x) => <option key={x} value={x} />)}</datalist>
            </fieldset>

            <fieldset className="card">
              <legend className="legend">My fandoms</legend>
              <FandomPicker
                fandoms={(fandoms ?? []).map((f) => ({ id: Number(f.id), name: String(f.name), category: String(f.category) }))}
                initial={(mine ?? []).map((m) => ({ fandomId: Number(m.fandom_id), level: Number(m.level) }))}
              />
            </fieldset>

            <fieldset className="card">
              <legend className="legend">Badge theme</legend>
              <div className="theme-grid">
                {BADGE_THEMES.map((t) => (
                  <label key={t.id} className="theme-option">
                    <input type="radio" name="badge_theme" value={t.id} defaultChecked={t.id === currentTheme} />
                    <span className={`theme-swatch cbadge theme-${t.id}`} aria-hidden="true">
                      <span className="cbadge-top" />
                      <span className="theme-swatch-body">
                        <span className="cbadge-chip">Fandom</span>
                      </span>
                    </span>
                    <span className="theme-name">{t.name}</span>
                    <span className="theme-for">{t.greatFor}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="card">
              <legend className="legend">About me</legend>
              <div className="field-grid">
                <label className="field field-wide">
                  Bio
                  <textarea name="bio" rows={4} maxLength={600} defaultValue={v("bio")} placeholder="The short version of your origin story." />
                </label>
                <label className="field field-wide">
                  My ideal con weekend
                  <input name="con_weekend" maxLength={200} defaultValue={v("con_weekend")} placeholder="Panels all morning, artist alley all afternoon…" />
                </label>
                <label className="field">
                  Current cosplay or WIP
                  <input name="current_cosplay" maxLength={120} defaultValue={v("current_cosplay")} />
                </label>
                <label className="field">
                  How I play
                  <input name="play_style" maxLength={120} defaultValue={v("play_style")} placeholder="Co-op healer, chaotic bard…" />
                </label>
                <label className="field">
                  My D&amp;D alignment
                  <select name="alignment" defaultValue={v("alignment")}>
                    <option value="">Prefer not to say</option>
                    {ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Current hyperfixation
                  <input name="hyperfixation" maxLength={120} defaultValue={v("hyperfixation")} />
                </label>
                <label className="field field-wide">
                  The fandom hill I&rsquo;ll die on
                  <input name="hill_to_die_on" maxLength={200} defaultValue={v("hill_to_die_on")} />
                </label>
              </div>
            </fieldset>

            <button type="submit" className="btn btn-hero save-btn">
              Save my badge
            </button>
          </form>

          <section className="card" aria-labelledby="photos-heading" style={{ marginTop: 28 }}>
            <h2 id="photos-heading" className="legend" style={{ margin: "0 0 14px" }}>
              Photos
            </h2>
            {profile ? (
              <PhotoManager userId={user.id} photos={photoList} />
            ) : (
              <p className="hint">Save your badge first, then you can add photos here.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
