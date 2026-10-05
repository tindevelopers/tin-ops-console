"use server";

import { headers } from "next/headers";
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
// The Neon server SDK returns { data, error } rather than throwing, so errors must be checked explicitly.
export async function requestReset(form: FormData) {
  const email = field(form, "email");
  const { error } = await getAuth().emailOtp.sendVerificationOtp({ email, type: "forget-password" });
  if (error) {
    fail("forgot", "Could not send the code. Try again in a minute.");
  }
  redirect(`/signin?step=reset&email=${encodeURIComponent(email)}`);
}

export async function resetPassword(form: FormData) {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  if (password.length < 12) fail("reset", "Use at least 12 characters.", email);
  // @neondatabase/auth 0.5.0-beta maps emailOtp.resetPassword to a nonexistent "email-otp/passcode" path (404 user_not_found),
  // so call the real Better Auth endpoint directly.
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const res = await fetch(`${process.env.NEON_AUTH_BASE_URL!.replace(/\/$/, "")}/email-otp/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, otp: field(form, "otp"), password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    fail("reset", body?.code === "INVALID_OTP" || body?.code === "OTP_EXPIRED" ? "That code is wrong or expired." : "Could not reset the password. Try again.", email);
  }
  redirect("/signin?step=signin&notice=password-set");
}
