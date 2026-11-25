"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

// Start (or continue) a trivia duel with a match.
export async function startDuel(formData: FormData) {
  const supabase = await client();
  const other = String(formData.get("other") ?? "");
  if (!UUID.test(other)) redirect("/matches");

  const { data, error } = await supabase.rpc("start_duel", { other });
  if (error || !data) redirect(`/matches?error=${encodeURIComponent(error?.message ?? "Couldn't start the duel.")}`);
  redirect(`/duel/${data}`);
}

// Lock in an answer, then show whether it was right.
export async function answerQuestion(formData: FormData) {
  const supabase = await client();
  const duel = String(formData.get("duel") ?? "");
  const idx = Number(formData.get("idx"));
  const pick = Number(formData.get("pick"));
  if (!UUID.test(duel)) redirect("/matches");

  const { error } = await supabase.rpc("answer_question", { did: duel, qidx: idx, pick });
  if (error) redirect(`/duel/${duel}?error=${encodeURIComponent(error.message)}`);
  redirect(`/duel/${duel}?last=${idx}`);
}
