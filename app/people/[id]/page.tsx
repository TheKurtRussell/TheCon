import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { loadProfileView } from "@/lib/profiles";
import AppHeader from "@/components/AppHeader";
import ProfileView from "@/components/ProfileView";
import SafetyMenu from "@/components/SafetyMenu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A match's full badge and profile.
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseEnv()) redirect("/login");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (id === user.id) redirect("/profile");

  // Only matches can open a full profile page.
  const { data: matched } = await supabase.rpc("is_match", { other: id });
  if (!matched) notFound();

  const data = await loadProfileView(supabase, id);
  if (!data) notFound();
  const name = data.profile.display_name ?? "them";

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "40px 0 80px" }}>
        <div className="wrap">
          <p style={{ margin: "0 0 16px" }}>
            <Link href="/matches">&larr; Back to my matches</Link>
          </p>
          <ProfileView
            data={data}
            highlight={
              <div className="shared-banner display">You matched! Icebreaker games arrive in Phase 4.</div>
            }
            actions={<SafetyMenu target={id} name={name} back="/matches" />}
          />
        </div>
      </main>
    </>
  );
}
