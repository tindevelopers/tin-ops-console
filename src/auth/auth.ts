import { createNeonAuth } from "@neondatabase/auth/next/server";

// Lazy: createNeonAuth throws without the env vars, which would break `next build` in CI.
let instance: ReturnType<typeof createNeonAuth> | undefined;

export function getAuth() {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}

// The Neon server SDK returns { data, error }; NeonAuthProvider (domain-identity 2.3.0) reads session.user directly and always sees null.
export async function getCurrentUser() {
  const { data } = await getAuth().getSession();
  return data?.user ?? null;
}
