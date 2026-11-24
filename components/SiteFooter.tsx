export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span className="display" style={{ fontSize: 22, color: "var(--yellow)" }}>
          THE CON
        </span>
        <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {/* TODO: real pages for these before launch */}
          <a href="#conduct">Code of conduct</a>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
