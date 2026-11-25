import { levelLabel } from "@/lib/themes";

export type BadgeFandom = { name: string; level: number };

type Props = {
  theme: string;
  name: string;
  age?: number | null;
  pronouns?: string | null;
  city?: string | null;
  fandoms: BadgeFandom[];
  photoUrl?: string | null;
  verified?: boolean;
};

// The convention-badge card. Its colors come from the `theme-<id>` class.
export default function Badge({ theme, name, age, pronouns, city, fandoms, photoUrl, verified }: Props) {
  const top = [...fandoms].sort((a, b) => b.level - a.level).slice(0, 6);
  const details = [pronouns, city].filter(Boolean).join(" · ");

  return (
    <div className="badge-wrap">
      <div className="lanyard" aria-hidden="true" />
      <article className={`cbadge theme-${theme}`} aria-label={`${name}'s badge`}>
        <div className="cbadge-top">
          <span className="display" style={{ fontSize: 26 }}>THE CON</span>
          <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>{verified ? "✓ VERIFIED" : "ATTENDEE"}</span>
        </div>
        <div className="cbadge-body">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cbadge-photo" src={photoUrl} alt={`Photo of ${name}`} />
          ) : (
            <div className="cbadge-photo cbadge-nophoto">NO PHOTO YET</div>
          )}
          <p className="display" style={{ margin: "14px 0 0", fontSize: 34, lineHeight: 1 }}>
            {name}
            {age ? `, ${age}` : ""}
          </p>
          {details && <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600 }}>{details}</p>}
          {top.length > 0 && (
            <div className="chips">
              {top.map((f) => (
                <span key={f.name} className="cbadge-chip" title={levelLabel(f.level)}>
                  {f.name}
                  {f.level === 3 ? " ★" : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
