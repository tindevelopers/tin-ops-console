import { createNeonAuth } from "@neondatabase/auth/next/server";
import { NeonAuthProvider } from "@tindevelopers/domain-identity/auth/neon-provider";

// Lazy: createNeonAuth throws without the env vars, which would break `next build` in CI.
let instance: ReturnType<typeof createNeonAuth> | undefined;

export function getAuth() {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}

export const getAuthProvider = () => new NeonAuthProvider(getAuth());
