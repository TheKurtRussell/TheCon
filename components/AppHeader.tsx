import Link from "next/link";
import { logOut } from "@/app/auth/actions";

// Header for logged-in pages.
export default function AppHeader() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/profile" className="logo" aria-label="My badge">
          THE CON
        </Link>
        <nav className="nav" aria-label="Account">
          <Link href="/profile">My badge</Link>
          <Link href="/profile/edit">Edit profile</Link>
          <form action={logOut}>
            <button type="submit" className="link-button">
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
