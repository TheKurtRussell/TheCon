import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import AppHeader from "@/components/AppHeader";
import { answerQuestion, startDuel } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LETTERS = ["A", "B", "C", "D"];

type Question = {
  idx: number;
  question: string;
  choices: string[];
  fandom: string | null;
  my_choice: number | null;
  answer: number | null;
  their_choice: number | null;
};

type Duel = {
  id: string;
  status: "active" | "done";
  other_id: string;
  other_name: string;
  total: number;
  my_count: number;
  their_count: number;
  my_score: number;
  their_score: number | null;
  questions: Question[];
};

export default async function DuelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ last?: string; error?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { id } = await params;
  const { last, error } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("get_duel", { did: id });
  if (!data) notFound();
  const duel = data as Duel;
  const them = duel.other_name ?? "your match";

  const lastIdx = last !== undefined ? Number(last) : NaN;
  const lastQ = duel.questions.find((q) => q.idx === lastIdx && q.my_choice !== null);
  const current = duel.status === "active" ? duel.questions[duel.my_count] : undefined;

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "40px 0 80px" }}>
        <div className="wrap duel-wrap">
          <p style={{ margin: "0 0 12px" }}>
            <Link href={`/people/${duel.other_id}`}>&larr; Back to {them}</Link>
          </p>
          <h1 className="h2">Trivia Duel</h1>
          <p className="duel-sub">
            You vs <strong>{them}</strong>. Five questions, loser picks the first-date snack.
          </p>

          <div className="scoreboard">
            <div className="score score-me">
              <span>YOU</span>
              <strong className="display">{duel.my_score}</strong>
              <small>
                {duel.my_count}/{duel.total} answered
              </small>
            </div>
            <span className="vs display" aria-hidden="true">VS</span>
            <div className="score score-them">
              <span>{them.toUpperCase()}</span>
              <strong className="display">{duel.status === "done" ? duel.their_score : "?"}</strong>
              <small>
                {duel.their_count}/{duel.total} answered
              </small>
            </div>
          </div>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {lastQ && (
            <p className={`verdict display ${lastQ.my_choice === lastQ.answer ? "verdict-hit" : "verdict-miss"}`} role="status">
              {lastQ.my_choice === lastQ.answer
                ? "Critical hit! +1 point"
                : `Missed! It was ${lastQ.choices[lastQ.answer ?? 0]}.`}
            </p>
          )}

          {current && (
            <section className="card question-card" aria-labelledby="q-text">
              <p className="q-meta">
                Question {current.idx + 1} of {duel.total}
                {current.fandom ? ` · ${current.fandom}` : " · General geekery"}
              </p>
              <h2 id="q-text" className="q-text">
                {current.question}
              </h2>
              <div className="answers">
                {current.choices.map((choice, i) => (
                  <form key={i} action={answerQuestion}>
                    <input type="hidden" name="duel" value={duel.id} />
                    <input type="hidden" name="idx" value={current.idx} />
                    <input type="hidden" name="pick" value={i} />
                    <button type="submit" className="answer-btn">
                      <span className="answer-letter">{LETTERS[i]}</span>
                      {choice}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          )}

          {duel.status === "active" && !current && (
            <div className="card">
              <h2 className="legend">You&rsquo;re done!</h2>
              <p style={{ margin: 0, fontSize: 17 }}>
                Waiting for {them} to finish ({duel.their_count}/{duel.total}). Scores show once you&rsquo;ve both played.
              </p>
            </div>
          )}

          {duel.status === "done" && (
            <>
              <div className="card results">
                <p className="display results-headline">
                  {duel.my_score > (duel.their_score ?? 0)
                    ? `You win! ${them} picks the snack.`
                    : duel.my_score < (duel.their_score ?? 0)
                      ? `${them} wins! You pick the snack.`
                      : "It's a tie! Split the snacks."}
                </p>
                <form action={startDuel}>
                  <input type="hidden" name="other" value={duel.other_id} />
                  <button type="submit" className="btn btn-hero">
                    Rematch
                  </button>
                </form>
              </div>

              <ol className="review">
                {duel.questions.map((q) => (
                  <li key={q.idx} className="card review-item">
                    <p className="q-meta">{q.fandom ?? "General geekery"}</p>
                    <p className="review-q">{q.question}</p>
                    <p className="review-a">
                      Answer: <strong>{q.choices[q.answer ?? 0]}</strong>
                    </p>
                    <p className="review-picks">
                      You: {q.my_choice === q.answer ? "✓" : "✗"} {q.choices[q.my_choice ?? 0]} · {them}:{" "}
                      {q.their_choice === q.answer ? "✓" : "✗"} {q.choices[q.their_choice ?? 0]}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </main>
    </>
  );
}
