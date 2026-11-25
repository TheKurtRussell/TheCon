import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { logOut } from "@/app/auth/actions";
import { CONTACT_EMAIL } from "@/lib/site";

export default function SuspendedPage() {
  return (
    <>
      <SiteHeader />
      <main className="auth dots">
        <div className="panel">
          <div className="panel-top">
            <h1>Account suspended</h1>
          </div>
          <div className="panel-body">
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
              Your account has been suspended for breaking our <Link href="/conduct">Code of Conduct</Link>. While
              it&rsquo;s suspended, other members can&rsquo;t see you.
            </p>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
              If you think this is a mistake, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <form action={logOut}>
              <button type="submit" className="btn" style={{ width: "100%" }}>
                Log out
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
