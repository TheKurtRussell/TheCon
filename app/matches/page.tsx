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
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
