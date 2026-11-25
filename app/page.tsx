import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  return (
    <>
      <SiteHeader />
      {deleted && (
        <p className="alert wrap" role="status" style={{ margin: "16px auto", maxWidth: 1152 }}>
          Your account has been deleted. Thanks for being part of The CON.
        </p>
      )}
      <main>
        <section className="hero dots">
          <div className="wrap">
            <div className="hero-copy">
              <p className="tag">Dating for gamers, cosplayers and superfans</p>
              <h1>
                Where dating is a little <span className="pop">unconventional.</span>
              </h1>
              <p className="hero-sub">
                Match on the fandoms you love. Break the ice with a game instead of
                &ldquo;hey.&rdquo; Find your player two.
              </p>
              <div className="actions">
                <Link href="/signup" className="btn btn-hero">
                  Get your badge
                </Link>
                <a href="#how" className="btn">
                  See how it works
                </a>
              </div>
              <p className="fine">18+ only. Free to join.</p>
            </div>

            <div className="badge-holder" aria-hidden="true">
              <div className="badge-wrap">
                <div className="lanyard" />
                <div className="badge">
                  <div className="badge-top">
                    <span className="display" style={{ fontSize: 26 }}>THE CON</span>
                    <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>ATTENDEE</span>
                  </div>
                  <div className="badge-body">
                    <div className="photo dots">YOUR PHOTO HERE</div>
                    <p className="display" style={{ margin: "14px 0 0", fontSize: 34, lineHeight: 1 }}>
                      Jess, 29
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600 }}>
                      she/her · Orlando
                    </p>
                    <div className="chips">
                      <span className="chip chip-blue">Critical Role</span>
                      <span className="chip chip-yellow">Zelda</span>
                      <span className="chip">Cosplay</span>
                    </div>
                  </div>
                </div>
                <div className="burst">3 shared fandoms!</div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" style={{ background: "var(--yellow)" }}>
          <div className="wrap section">
            <h2 className="h2">How it works</h2>
            <div className="grid3">
              <div className="card">
                <p className="num" style={{ color: "var(--red)" }}>1</p>
                <h3>Make your badge</h3>
                <p>Tag your fandoms, games and cosplays, from casual fan to full-on superfan.</p>
              </div>
              <div className="card">
                <p className="num" style={{ color: "var(--blue)" }}>2</p>
                <h3>Match on what you love</h3>
                <p>We put people who share your fandoms first, so you always have something to talk about.</p>
              </div>
              <div className="card">
                <p className="num" style={{ color: "var(--red)" }}>3</p>
                <h3>Play before you chat</h3>
                <p>Start with a quick game together. No more staring at a blank &ldquo;hey.&rdquo;</p>
              </div>
            </div>
          </div>
        </section>

        <section id="games" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          <div className="wrap section">
            <h2 className="h2" style={{ color: "var(--yellow)" }}>Icebreakers, not small talk</h2>
            <p className="lead" style={{ margin: "10px 0 0" }}>
              Every match unlocks a game. Win, lose or roll a nat 1, you&rsquo;ll have a story to start with.
            </p>
            <div className="grid3">
              <div className="game" style={{ background: "var(--red)", color: "var(--white)" }}>
                <span className="pill" style={{ background: "var(--yellow)", color: "var(--ink)" }}>PLAY NOW</span>
                <h3>Fandom Trivia Duel</h3>
                <p>Five questions from the fandoms you share. Loser picks the first-date snack.</p>
              </div>
              <div className="game" style={{ background: "var(--blue)", color: "var(--white)" }}>
                <span className="pill" style={{ background: "var(--paper)", color: "var(--ink)" }}>COMING SOON</span>
                <h3>D&amp;D One-Shot</h3>
                <p>A short adventure for two, so you can see how they handle a dragon.</p>
              </div>
              <div className="game" style={{ background: "var(--paper)", color: "var(--ink)" }}>
                <span className="pill" style={{ background: "var(--ink)", color: "var(--paper)" }}>COMING SOON</span>
                <h3>Board Game Night</h3>
                <p>Quick online board games, co-op or head-to-head. Your call.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="safety" className="safety dots">
          <div className="wrap section">
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <h2 className="h2">
                A safe space. <span style={{ color: "var(--blue)" }}>No gatekeeping.</span>
              </h2>
              <p className="lead" style={{ margin: "16px 0 0" }}>
                The CON is built for the people mainstream apps overlook. Be exactly as nerdy as you are.
              </p>
            </div>
            <ul className="safety-list">
              <li><strong>18+ only</strong>, with verified badges and ID checks on the way</li>
              <li><strong>Block and report</strong> on every profile and chat</li>
              <li><strong>Your identity, your words:</strong> pronouns and gender in free text</li>
              <li><strong>Real moderators</strong> and a <Link href="/conduct">code of conduct</Link> everyone agrees to</li>
            </ul>
          </div>
        </section>

        <section style={{ background: "var(--red)", color: "var(--white)", textAlign: "center" }}>
          <div className="wrap" style={{ padding: "80px 24px" }}>
            <h2 className="h2" style={{ fontSize: "clamp(48px, 6vw, 80px)", WebkitTextStroke: "2px var(--ink)" }}>
              Your badge is waiting.
            </h2>
            <p style={{ margin: "12px auto 32px", fontSize: 19, maxWidth: 520 }}>
              Join now and be first in line when doors open.
            </p>
            <Link href="/signup" className="btn btn-hero btn-yellow" style={{ color: "var(--ink)" }}>
              Get your badge
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
