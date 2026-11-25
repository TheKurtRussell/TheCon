import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { loadProfileView } from "@/lib/profiles";
import AppHeader from "@/components/AppHeader";
import ProfileView from "@/components/ProfileView";

export default async function MyBadgePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!supabaseEnv()) redirect("/login");
  const { saved } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await loadProfileView(supabase, user.id);
  if (!data) redirect("/profile/edit");

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "48px 0 80px" }}>
        <div className="wrap">
          {saved && (
            <p className="alert" role="status" style={{ maxWidth: 560 }}>
              Badge saved! This is how other members will see you.
            </p>
          )}
          <ProfileView
            data={data}
            actions={
              <>
                <Link href="/profile/edit" className="btn">
                  Edit my badge
                </Link>
                <Link href="/discover" className="btn btn-hero">
                  Start discovering
                </Link>
              </>
            }
          />
        </div>
      </main>
    </>
  );
}
