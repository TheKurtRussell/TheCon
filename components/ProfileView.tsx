import Badge from "@/components/Badge";
import { levelLabel } from "@/lib/themes";
import type { ProfileViewData } from "@/lib/profiles";

const ABOUT_FIELDS: { key: string; label: string }[] = [
  { key: "looking_for", label: "Looking for" },
  { key: "con_weekend", label: "My ideal con weekend" },
  { key: "current_cosplay", label: "Current cosplay / WIP" },
  { key: "play_style", label: "How I play" },
  { key: "alignment", label: "D&D alignment" },
  { key: "hyperfixation", label: "Current hyperfixation" },
  { key: "hill_to_die_on", label: "The fandom hill I'll die on" },
  { key: "gender_identity", label: "Gender identity" },
];

// A member's badge on the left, their About details on the right.
// `actions` (buttons) and `highlight` (e.g. shared fandoms) are optional extras.
export default function ProfileView({
  data,
  actions,
  highlight,
}: {
  data: ProfileViewData;
  actions?: React.ReactNode;
  highlight?: React.ReactNode;
}) {
  const p = data.profile;
  const about = ABOUT_FIELDS.filter((f) => p[f.key]);

  return (
    <div className="profile-layout">
      <div className="profile-badge">
        <Badge
          theme={p.badge_theme ?? "classic"}
          name={p.display_name ?? "Member"}
          age={data.age}
          pronouns={p.pronouns}
          city={p.city}
          fandoms={data.fandoms}
          photoUrl={data.photoUrl}
          verified={data.verified}
        />
        {actions && <div className="profile-actions">{actions}</div>}
      </div>

      <div className="profile-about">
        {highlight}

        {p.bio && (
          <div className="card">
            <h2 className="legend">About me</h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, whiteSpace: "pre-line" }}>{p.bio}</p>
          </div>
        )}

        {data.fandoms.length > 0 && (
          <div className="card">
            <h2 className="legend">Fandoms</h2>
            <ul className="fandom-list">
              {data.fandoms.map((f) => (
                <li key={f.name}>
                  <strong>{f.name}</strong> <span className="level">{levelLabel(f.level)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {about.length > 0 && (
          <div className="card">
            <dl className="about-list">
              {about.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{p[f.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
