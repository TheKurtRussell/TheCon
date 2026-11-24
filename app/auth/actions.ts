"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv, MISSING_ENV_MESSAGE } from "@/lib/supabase/env";

function back(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ageFrom(birthdate: string): number | null {
  const born = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export async function signUp(formData: FormData) {
  if (!supabaseEnv()) back("/signup", MISSING_ENV_MESSAGE);

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const birthdate = String(formData.get("birthdate") ?? "");
  const agreed = formData.get("conduct") === "on";

  if (!email || !password || !birthdate) back("/signup", "Please fill in every field.");
  if (password.length < 8) back("/signup", "Your password needs at least 8 characters.");
  if (!agreed) back("/signup", "Please agree to the code of conduct to join.");

  const age = ageFrom(birthdate);
  if (age === null || age > 120) back("/signup", "Please enter a real birthdate.");
  if (age < 18) back("/signup", "The CON is for adults 18 and over.");

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { birthdate, agreed_conduct_at: new Date().toISOString() },
    },
  });

  if (error) back("/signup", error.message);

  // Email confirmation is on (Supabase's default): ask them to check their inbox.
  if (!data.session) redirect("/signup?sent=1");

  redirect("/home");
}

export async function logIn(formData: FormData) {
  if (!supabaseEnv()) back("/login", MISSING_ENV_MESSAGE);

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) back("/login", "Enter your email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("/login", "That email and password don't match. Try again.");

  redirect("/home");
}

export async function logOut() {
  if (supabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
