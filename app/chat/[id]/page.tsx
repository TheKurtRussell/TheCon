import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { signedPhotoUrl } from "@/lib/profiles";
import AppHeader from "@/components/AppHeader";
import ChatThread, { type ChatMessage } from "@/components/ChatThread";
import SafetyMenu from "@/components/SafetyMenu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Conversation with one match.
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseEnv()) redirect("/login");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (id === user.id) redirect("/matches");

  const { data: matched } = await supabase.rpc("is_match", { other: id });
  if (!matched) notFound();

  const [{ data: them }, { data: photo }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("display_name, badge_theme").eq("id", id).maybeSingle(),
    supabase.from("photos").select("path").eq("profile_id", id).order("position").limit(1).maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`)
      .order("id", { ascending: false })
      .limit(100),
  ]);
  if (!them) notFound();

  const name = String(them.display_name ?? "your match");
  const photoUrl = await signedPhotoUrl(supabase, photo?.path);
  const initial = ((recent ?? []) as ChatMessage[]).reverse();

  return (
    <>
      <AppHeader />
      <main className="dots" style={{ padding: "32px 0 60px" }}>
        <div className="wrap chat-wrap">
          <div className={`chat-head cbadge theme-${them.badge_theme ?? "classic"}`}>
            <div className="cbadge-top">
              <Link href="/matches" className="chat-back" aria-label="Back to matches">
                &larr;
              </Link>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="chat-avatar" />
              ) : (
                <span className="chat-avatar chat-avatar-empty" aria-hidden="true" />
              )}
              <h1 className="display chat-name">{name}</h1>
              <Link href={`/people/${id}`} className="chat-profile-link">
                Profile &amp; duel
              </Link>
            </div>
          </div>

          <ChatThread me={user.id} other={id} otherName={name} initial={initial} />

          <div style={{ marginTop: 20, maxWidth: 420 }}>
            <SafetyMenu target={id} name={name} back="/matches" />
          </div>
        </div>
      </main>
    </>
  );
}
