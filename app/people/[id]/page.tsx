import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { loadProfileView } from "@/lib/profiles";
import AppHeader from "@/components/AppHeader";
import ProfileView from "@/components/ProfileView";
import SafetyMenu from "@/components/SafetyMenu";
import { startDuel } from "@/app/duel/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A match's full badge and profile.
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseEnv()) redirect("/login");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (id === user.id) redirect("/profile");

  // Only matches can open a full profile page.
  const { data: matched } = await supabase.rpc("is_match", { other: id });
  if (!matched) notFound();

  const data = await loadProfileView(supabase, id);
  if (!data) notFound();
  const name = data.profile.display_name ?? "them";

  const { data: duelData } = await supabase.rpc("duel_with", { other: id });
  const duel = duelData as { id: string; status: string; my_count: number; their_count: number } | null;
  let duelLabel = "Start a trivia duel";
  let duelNote = `Five questions from the fandoms you share. Loser picks the first-date snack.`;
  if (duel?.status === "active" && duel.my_count < 5) {
    duelLabel = duel.my_count === 0 ? "Your turn: play the duel" : "Continue your duel";
    duelNote = `${name} has answered ${duel.their_count} of 5.`;
  } else if (duel?.status === "active") {
    duelLabel = "View duel";
    duelNote = `You're done. Waiting on ${name} (${duel.their_count}/5).`;
  } else if (duel?.status === "done") {
    duelLabel = "See duel results";
    duelNote = "Want another round? Open the results and hit Rematch.";
  }

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "40px 0 80px" }}>
        <div className="wrap">
          <p style={{ margin: "0 0 16px" }}>
            <Link href="/matches">&larr; Back to my matches</Link>
          </p>
          <ProfileView
            data={data}
            highlight={
              <div className="card icebreakers">
                <h2 className="legend">Break the ice</h2>
                <div className="ice-grid">
                  <div className="ice-game ice-trivia">
                    <span className="pill" style={{ background: "var(--yellow)", color: "var(--ink)" }}>PLAY NOW</span>
                    <h3 className="display">Fandom Trivia Duel</h3>
                    <p>{duelNote}</p>
                    {duel ? (
                      <Link href={`/duel/${duel.id}`} className="btn btn-yellow">
                        {duelLabel}
                      </Link>
                    ) : (
                      <form action={startDuel}>
                        <input type="hidden" name="other" value={id} />
                        <button type="submit" className="btn btn-yellow">
                          {duelLabel}
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="ice-game ice-dnd">
                    <span className="pill" style={{ background: "var(--paper)", color: "var(--ink)" }}>PLAY TOGETHER</span>
                    <h3 className="display">D&amp;D One-Shot</h3>
                    <p>Set up a quick game for two on Roll20, then share the invite link with {name}.</p>
                    <a href="https://roll20.net" target="_blank" rel="noopener noreferrer" className="btn">
                      Open Roll20 ↗
                    </a>
                  </div>
                  <div className="ice-game ice-board">
                    <span className="pill" style={{ background: "var(--ink)", color: "var(--paper)" }}>PLAY TOGETHER</span>
                    <h3 className="display">Board Game Night</h3>
                    <p>Pick a game on Board Game Arena and invite {name} to your table.</p>
                    <a href="https://boardgamearena.com" target="_blank" rel="noopener noreferrer" className="btn">
                      Open Board Game Arena ↗
                    </a>
                  </div>
                </div>
              </div>
            }
            actions={
              <>
                <Link href={`/chat/${id}`} className="btn btn-hero">
                  Message {name}
                </Link>
                <SafetyMenu target={id} name={name} back="/matches" />
              </>
            }
          />
        </div>
      </main>
    </>
  );
}
