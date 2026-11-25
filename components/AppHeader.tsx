import Link from "next/link";
import { logOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

// Header for logged-in pages.
export default async function AppHeader() {
  const supabase = await createClient();
  const [{ data: isAdmin }, { data: unread }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("unread_counts"),
  ]);
  const unreadTotal = ((unread ?? []) as { unread: number }[]).reduce((sum, r) => sum + Number(r.unread), 0);

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/discover" className="logo" aria-label="Discover">
          THE CON
        </Link>
        <nav className="nav" aria-label="Account">
          <Link href="/discover">Discover</Link>
          <Link href="/matches">
            Matches
            {unreadTotal > 0 && (
              <span className="nav-badge" aria-label={`${unreadTotal} unread messages`}>
                {unreadTotal}
              </span>
            )}
          </Link>
          <Link href="/profile">My badge</Link>
          {isAdmin === true && <Link href="/admin">Moderation</Link>}
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
