import { blockMember, reportMember } from "@/app/discover/actions";

// "Block or report" menu shown on every profile card and match.
export default function SafetyMenu({ target, name, back }: { target: string; name: string; back: "/discover" | "/matches" }) {
  return (
    <details className="safety-menu">
      <summary>Block or report</summary>
      <div className="safety-body">
        <form action={blockMember}>
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="back" value={back} />
          <button type="submit" className="btn" style={{ width: "100%" }}>
            Block {name}
          </button>
          <p className="hint">They won&rsquo;t see you and you won&rsquo;t see them, anywhere on The CON.</p>
        </form>

        <form action={reportMember} className="report-form">
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Report reason
            <select name="reason" required defaultValue="">
              <option value="" disabled>
                Choose a reason…
              </option>
              <option value="fake_profile">Fake profile or catfishing</option>
              <option value="underage">Might be under 18</option>
              <option value="harassment">Harassment or threats</option>
              <option value="hate">Hate or discrimination</option>
              <option value="spam_scam">Spam or scam</option>
              <option value="inappropriate_photos">Inappropriate photos</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label className="field">
            What happened? (optional)
            <textarea name="details" rows={3} maxLength={1000} />
          </label>
          <label className="check">
            <input type="checkbox" name="also_block" defaultChecked />
            <span>Also block {name}</span>
          </label>
          <button type="submit" className="btn btn-hero" style={{ width: "100%" }}>
            Send report
          </button>
        </form>
      </div>
    </details>
  );
}
