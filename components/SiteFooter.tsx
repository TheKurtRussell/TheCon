import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span className="display" style={{ fontSize: 22, color: "var(--yellow)" }}>
          THE CON
        </span>
        <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          <Link href="/conduct">Code of conduct</Link>
          <Link href="/safety">Safety tips</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
        </nav>
      </div>
    </footer>
  );
}
