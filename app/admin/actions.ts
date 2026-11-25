"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The database refuses all of these unless you're a moderator.
async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

function done(error: { message: string } | null) {
  revalidatePath("/admin");
  redirect(error ? `/admin?error=${encodeURIComponent(error.message)}` : "/admin?ok=1");
}

export async function updateReport(formData: FormData) {
  const supabase = await client();
  const rid = String(formData.get("report") ?? "");
  if (!UUID.test(rid)) redirect("/admin");
  const { error } = await supabase.rpc("admin_update_report", {
    rid,
    new_status: String(formData.get("status") ?? "reviewing"),
    note: String(formData.get("note") ?? ""),
  });
  done(error);
}

export async function setSuspended(formData: FormData) {
  const supabase = await client();
  const uid = String(formData.get("member") ?? "");
  if (!UUID.test(uid)) redirect("/admin");
  const { error } = await supabase.rpc("admin_set_suspended", {
    uid,
    suspend: formData.get("suspend") === "true",
    why: String(formData.get("why") ?? ""),
  });
  done(error);
}

export async function setVerified(formData: FormData) {
  const supabase = await client();
  const uid = String(formData.get("member") ?? "");
  if (!UUID.test(uid)) redirect("/admin");
  const { error } = await supabase.rpc("admin_set_verified", { uid, verified: formData.get("verified") === "true" });
  done(error);
}
