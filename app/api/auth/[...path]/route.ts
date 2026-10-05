import { getAuth } from "@/src/auth/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };
const forward = (method: "GET" | "POST") => (req: Request, ctx: Ctx) => getAuth().handler()[method](req, ctx);

export const GET = forward("GET");
export const POST = forward("POST");
