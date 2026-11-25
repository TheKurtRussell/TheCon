import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { loadProfileView, signedPhotoUrl } from "@/lib/profiles";
import AppHeader from "@/components/AppHeader";
import ProfileView from "@/components/ProfileView";
import SafetyMenu from "@/components/SafetyMenu";
import { swipe } from "./actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ matched?: string; blocked?: string; reported?: string; error?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { matched, blocked, reported, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mine } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!mine) redirect("/profile/edit");

  // Just matched? Celebrate first.
  if (matched && UUID.test(matched)) {
    const { data: them } = await supabase.from("profiles").select("display_name, badge_theme").eq("id", matched).maybeSingle();
    const { data: photo } = await supabase
      .from("photos")
      .select("path")
      .eq("profile_id", matched)
      .order("position")
      .limit(1)
      .maybeSingle();
    const photoUrl = await signedPhotoUrl(supabase, photo?.path);
    const name = (them?.display_name as string | undefined) ?? "your match";

    return (
      <>
        <AppHeader />
        <main className="auth dots">
          <div className="match-pop">
            <p className="match-burst display">It&rsquo;s a match!</p>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={`Photo of ${name}`} className="match-photo" />
            )}
            <p className="display" style={{ fontSize: 40, margin: "8px 0 0" }}>Roll for initiative!</p>
            <p style={{ fontSize: 18, margin: "6px 0 24px" }}>
              You and <strong>{name}</strong> liked each other.
            </p>
            <div className="actions" style={{ justifyContent: "center", marginTop: 0 }}>
              <Link href="/matches" className="btn btn-hero">
                See my matches
              </Link>
              <Link href="/discover" className="btn">
                Keep discovering
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const { data: feed, error: feedError } = await supabase.rpc("discover_profiles", { max_results: 1 });
  const next = (feed as { id: string; score: number; shared_fandoms: string[] }[] | null)?.[0];
  const data = next ? await loadProfileView(supabase, next.id) : null;
  const name = data?.profile.display_name ?? "them";

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "40px 0 80px" }}>
        <div className="wrap">
          <h1 className="h2" style={{ marginBottom: 20 }}>Discover</h1>

          {blocked && <p className="alert" role="status">Blocked. You won&rsquo;t see each other again.</p>}
          {reported && <p className="alert" role="status">Thanks for reporting. Our moderators will take a look.</p>}
          {(error || feedError) && (
            <p className="alert" role="alert">
              {error ??
                `Discover isn't ready yet (${feedError?.message}). Make sure supabase/phase3_matching.sql has been run.`}
            </p>
          )}

          {data && next ? (
            <ProfileView
              data={data}
              highlight={
                next.shared_fandoms.length > 0 ? (
                  <div className="shared-banner display">
                    You both love: {next.shared_fandoms.slice(0, 4).join(", ")}
                    {next.shared_fandoms.length > 4 ? ` +${next.shared_fandoms.length - 4} more` : ""}
                  </div>
                ) : (
                  <div className="shared-banner shared-none">No shared fandoms yet. Could be a new quest!</div>
                )
              }
              actions={
                <>
                  <div className="swipe-row">
                    <form action={swipe}>
                      <input type="hidden" name="target" value={next.id} />
                      <input type="hidden" name="act" value="pass" />
                      <button type="submit" className="btn swipe-pass">
                        Pass
                      </button>
                    </form>
                    <form action={swipe}>
                      <input type="hidden" name="target" value={next.id} />
                      <input type="hidden" name="act" value="like" />
                      <button type="submit" className="btn btn-hero swipe-like">
                        Like {name}
                      </button>
                    </form>
                  </div>
                  <SafetyMenu target={next.id} name={name} back="/discover" />
                </>
              }
            />
          ) : (
            !feedError && (
              <div className="card" style={{ maxWidth: 560 }}>
                <h2 className="legend">You&rsquo;ve met everyone for now</h2>
                <p style={{ margin: "0 0 18px", fontSize: 17, lineHeight: 1.5 }}>
                  New members join all the time. You can also widen who you&rsquo;d like to meet, like your age range or
                  &ldquo;Show me&rdquo; groups.
                </p>
                <div className="actions" style={{ marginTop: 0 }}>
                  <Link href="/profile/edit#meet" className="btn btn-yellow">
                    Change who I meet
                  </Link>
                  <Link href="/matches" className="btn">
                    My matches
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </>
  );
}
