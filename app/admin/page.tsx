import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import AppHeader from "@/components/AppHeader";
import { setSuspended, setVerified, updateReport } from "./actions";

const REASON_LABELS: Record<string, string> = {
  fake_profile: "Fake profile / catfishing",
  underage: "Might be under 18",
  harassment: "Harassment or threats",
  hate: "Hate or discrimination",
  spam_scam: "Spam or scam",
  inappropriate_photos: "Inappropriate photos",
  other: "Something else",
};

type Report = {
  id: string;
  created_at: string;
  reason: string;
  details: string | null;
  status: string;
  mod_note: string | null;
  reporter_name: string | null;
  target_id: string;
  target_name: string | null;
  target_city: string | null;
  target_bio: string | null;
  target_report_count: number;
  target_suspended: boolean;
  target_verified: boolean;
};

// Moderator queue. Only people listed in the `admins` table can open it.
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; ok?: string; error?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { all, ok, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const { data, error: loadError } = await supabase.rpc("admin_reports", { show_closed: all === "1" });
  const reports = (data ?? []) as Report[];

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "40px 0 80px" }}>
        <div className="wrap admin-wrap">
          <h1 className="h2">Moderation queue</h1>
          <p className="duel-sub">
            {reports.length} {all === "1" ? "reports" : "open reports"} ·{" "}
            {all === "1" ? <Link href="/admin">Show open only</Link> : <Link href="/admin?all=1">Show closed too</Link>}
          </p>

          {ok && <p className="alert" role="status">Saved.</p>}
          {(error || loadError) && (
            <p className="alert" role="alert">
              {error ?? loadError?.message}
            </p>
          )}

          {reports.length === 0 && !loadError && (
            <div className="card">
              <p style={{ margin: 0, fontSize: 17 }}>Nothing to review. The con floor is calm.</p>
            </div>
          )}

          <ul className="report-list">
            {reports.map((r) => (
              <li key={r.id} className={`card report-item ${r.reason === "underage" ? "report-urgent" : ""}`}>
                <div className="report-head">
                  <span className={`pill status-${r.status}`}>{r.status.toUpperCase()}</span>
                  <strong>{REASON_LABELS[r.reason] ?? r.reason}</strong>
                  <span className="hint" style={{ margin: 0 }}>
                    {new Date(r.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                <p className="report-who">
                  <strong>{r.target_name ?? "Deleted member"}</strong>
                  {r.target_city ? ` · ${r.target_city}` : ""} · reported {r.target_report_count}×
                  {r.target_suspended && <span className="pill status-closed"> SUSPENDED</span>}
                  {r.target_verified && <span className="pill status-open"> VERIFIED</span>}
                  <br />
                  <span className="hint">Reported by {r.reporter_name ?? "a deleted member"}</span>
                </p>
                {r.details && <blockquote className="report-details">{r.details}</blockquote>}
                {r.target_bio && <p className="report-bio">Their bio: {r.target_bio}</p>}

                <form action={updateReport} className="report-update">
                  <input type="hidden" name="report" value={r.id} />
                  <label className="field">
                    Moderator note
                    <input name="note" defaultValue={r.mod_note ?? ""} maxLength={1000} />
                  </label>
                  <label className="field">
                    Status
                    <select name="status" defaultValue={r.status}>
                      <option value="open">Open</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <button type="submit" className="btn btn-yellow">
                    Save
                  </button>
                </form>

                <div className="report-actions">
                  <form action={setSuspended} className="inline-form">
                    <input type="hidden" name="member" value={r.target_id} />
                    <input type="hidden" name="suspend" value={r.target_suspended ? "false" : "true"} />
                    {!r.target_suspended && (
                      <input name="why" placeholder="Reason (private)" maxLength={500} aria-label="Suspension reason" />
                    )}
                    <button type="submit" className="btn">
                      {r.target_suspended ? "Lift suspension" : "Suspend member"}
                    </button>
                  </form>
                  <form action={setVerified}>
                    <input type="hidden" name="member" value={r.target_id} />
                    <input type="hidden" name="verified" value={r.target_verified ? "false" : "true"} />
                    <button type="submit" className="btn">
                      {r.target_verified ? "Remove verified" : "Mark verified"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
