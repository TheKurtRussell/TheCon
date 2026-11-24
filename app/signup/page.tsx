import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { signUp } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="auth dots">
        <div className="panel">
          <div className="panel-top">
            <h1>Get your badge</h1>
          </div>

          {sent ? (
            <div className="panel-body">
              <p className="alert" role="status">
                Check your email! Click the link we sent to confirm your account.
              </p>
              <p className="switch">
                Already confirmed? <Link href="/login">Log in</Link>
              </p>
            </div>
          ) : (
            <form action={signUp} className="panel-body">
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
              <label className="field">
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="field">
                Password (8+ characters)
                <input name="password" type="password" autoComplete="new-password" minLength={8} required />
              </label>
              <label className="field">
                Birthdate (you must be 18+)
                <input name="birthdate" type="date" autoComplete="bday" required />
              </label>
              <label className="check">
                <input name="conduct" type="checkbox" required />
                <span>
                  I&rsquo;m 18 or older and I agree to treat everyone at The CON with respect, per the{" "}
                  <a href="#conduct">code of conduct</a>.
                </span>
              </label>
              <button type="submit" className="btn btn-hero">
                Join The CON
              </button>
              <p className="switch">
                Have a badge already? <Link href="/login">Log in</Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
