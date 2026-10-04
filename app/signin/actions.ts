"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/src/auth/auth";

const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const fail = (step: string, msg: string, email = ""): never =>
  redirect(`/signin?step=${step}&error=${encodeURIComponent(msg)}${email ? `&email=${encodeURIComponent(email)}` : ""}`);

export async function signIn(form: FormData) {
  const email = field(form, "email");
  const { error } = await getAuth().signIn.email({ email, password: String(form.get("password") ?? "") });
  if (error) fail("signin", "Sign-in failed. Check your email and password.");
  redirect("/");
}

export async function signOut() {
  await getAuth().signOut();
  redirect("/signin");
}

// Neon sends a one-time code to the address. The response is the same whether or not the user exists.
export async function requestReset(form: FormData) {
  const email = field(form, "email");
  try {
    await getAuth().emailOtp.sendVerificationOtp({ email, type: "forget-password" });
  } catch {
    fail("forgot","Could not send the code. Try again in a minute.");
  }
  redirect(`/signin?step=reset&email=${encodeURIComponent(email)}`);
}

export async function resetPassword(form: FormData) {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  if (password.length < 12) fail("reset", "Use at least 12 characters.", email);
  try {
    await getAuth().emailOtp.resetPassword({ email, otp: field(form, "otp"), password });
  } catch {
    fail("reset", "That code is wrong or expired.", email);
  }
  redirect("/signin?step=signin&notice=password-set");
}
