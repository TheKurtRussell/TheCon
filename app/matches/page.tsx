import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { signedPhotoUrl } from "@/lib/profiles";
import AppHeader from "@/components/AppHeader";

type Match = {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  badge_theme: string;
  photo_path: string | null;
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; reported?: string; error?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { blocked, reported, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error: matchError } = await supabase.rpc("my_matches");
  const matches = (data ?? []) as Match[];
  const photos = await Promise.all(matches.map((m) => signedPhotoUrl(supabase, m.photo_path)));
  const { data: unreadData } = await supabase.rpc("unread_counts");
  const unreadBy = new Map(
    ((unreadData ?? []) as { other_id: string; unread: number }[]).map((u) => [u.other_id, Number(u.unread)])
  );
  const { data: sentData } = await supabase.rpc("my_likes_sent");
  const sent = (sentData ?? []) as { id: string; display_name: string; badge_theme: string; liked_at: string }[];

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "40px 0 80px" }}>
        <div className="wrap">
          <h1 className="h2" style={{ marginBottom: 20 }}>My matches</h1>

          {blocked && <p className="alert" role="status">Blocked. They&rsquo;re gone from your matches.</p>}
          {reported && <p className="alert" role="status">Thanks for reporting. Our moderators will take a look.</p>}
          {(error || matchError) && (
            <p className="alert" role="alert">
              {error ?? matchError?.message}
            </p>
          )}

          {matches.length === 0 && !matchError ? (
            <div className="card" style={{ maxWidth: 560 }}>
              <h2 className="legend">No matches yet</h2>
              <p style={{ margin: "0 0 18px", fontSize: 17 }}>
                When you and someone both hit Like, they&rsquo;ll show up here.
              </p>
              <Link href="/discover" className="btn btn-hero">
                Go discover
              </Link>
            </div>
          ) : (
            <ul className="match-grid">
              {matches.map((m, i) => (
                <li key={m.id}>
                  <Link href={`/people/${m.id}`} className={`match-card cbadge theme-${m.badge_theme}`}>
                    <span className="cbadge-top">
                      <span className="display" style={{ fontSize: 20 }}>MATCH</span>
                    </span>
                    {photos[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photos[i]!} alt="" className="match-card-photo" />
                    ) : (
                      <span className="match-card-photo cbadge-nophoto">NO PHOTO</span>
                    )}
                    <span className="match-card-name display">
                      {m.display_name}
                      {m.age ? `, ${m.age}` : ""}
                    </span>
                    {m.city && <span className="match-card-city">{m.city}</span>}
                  </Link>
                  <Link href={`/chat/${m.id}`} className="btn match-chat">
                    Message
                    {unreadBy.get(m.id) ? <span className="nav-badge">{unreadBy.get(m.id)}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {sent.length > 0 && (
            <section className="likes-sent" aria-labelledby="sent-heading">
              <h2 id="sent-heading" className="legend">Likes sent</h2>
              <p className="hint" style={{ margin: "0 0 14px" }}>
                You liked them. If they like you back, they&rsquo;ll move up to your matches.
              </p>
              <ul className="sent-list">
                {sent.map((s) => (
                  <li key={s.id} className={`sent-chip cbadge theme-${s.badge_theme}`}>
                    <span className="cbadge-top">
                      <span>{s.display_name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
