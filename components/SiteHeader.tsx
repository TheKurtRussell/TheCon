import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="The CON home">
          THE CON
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#how">How it works</Link>
          <Link href="/#games">Icebreakers</Link>
          <Link href="/#safety">Safety</Link>
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="btn btn-badge">
            Get your badge
          </Link>
        </nav>
      </div>
    </header>
  );
}
