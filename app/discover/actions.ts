"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASONS = ["fake_profile", "underage", "harassment", "hate", "spam_scam", "inappropriate_photos", "other"];
// Only send people back to pages we know about.
const BACK_PAGES = ["/discover", "/matches"];

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function targetFrom(formData: FormData): string {
  const target = String(formData.get("target") ?? "");
  if (!UUID.test(target)) redirect("/discover");
  return target;
}

function backFrom(formData: FormData): string {
  const back = String(formData.get("back") ?? "/discover");
  return BACK_PAGES.includes(back) ? back : "/discover";
}

// Like or pass on someone in Discover.
export async function swipe(formData: FormData) {
  const { supabase } = await signedIn();
  const target = targetFrom(formData);
  const act = formData.get("act") === "like" ? "like" : "pass";

  const { data: matched, error } = await supabase.rpc("record_swipe", { target, act });
  if (error) redirect(`/discover?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/matches");
  redirect(matched ? `/discover?matched=${target}` : "/discover");
}

// Block someone: they disappear for you, and you for them, everywhere.
export async function blockMember(formData: FormData) {
  const { supabase, user } = await signedIn();
  const target = targetFrom(formData);
  const back = backFrom(formData);

  const { error } = await supabase
    .from("blocks")
    .upsert({ blocker_id: user.id, blocked_id: target }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/matches");
  redirect(`${back}?blocked=1`);
}

// Report someone to the moderators, and block them too (unless unticked).
export async function reportMember(formData: FormData) {
  const { supabase, user } = await signedIn();
  const target = targetFrom(formData);
  const back = backFrom(formData);
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 1000) || null;

  if (!REASONS.includes(reason)) redirect(`${back}?error=${encodeURIComponent("Please choose a reason.")}`);

  const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_id: target, reason, details });
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);

  if (formData.get("also_block") === "on") {
    await supabase
      .from("blocks")
      .upsert({ blocker_id: user.id, blocked_id: target }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  }

  revalidatePath("/matches");
  redirect(`${back}?reported=1`);
}
