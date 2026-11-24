import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { logOut } from "@/app/auth/actions";

// The logged-in home page. Phase 2 turns this into profile setup.
export default async function HomePage() {
  if (!supabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="auth dots">
      <div className="panel">
        <div className="panel-top">
          <h1>You&rsquo;re in!</h1>
        </div>
        <div className="panel-body">
          <p style={{ margin: 0, fontSize: 17 }}>
            Badge issued to <strong>{user.email}</strong>.
          </p>
          <p className="alert">Next up: build your profile and pick your fandoms. (Coming in Phase 2.)</p>
          <form action={logOut}>
            <button type="submit" className="btn" style={{ width: "100%" }}>
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
