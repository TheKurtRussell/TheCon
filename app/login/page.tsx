import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { logIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="auth dots">
        <div className="panel">
          <div className="panel-top">
            <h1>Welcome back</h1>
          </div>
          <form action={logIn} className="panel-body">
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
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button type="submit" className="btn btn-hero">
              Log in
            </button>
            <p className="switch">
              New here? <Link href="/signup">Get your badge</Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
