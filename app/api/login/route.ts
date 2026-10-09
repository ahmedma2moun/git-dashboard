import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, createSession, safeEqual } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const user = String(form.get("username") ?? "");
  const pass = String(form.get("password") ?? "");
  const expectedUser = process.env.DASHBOARD_USERNAME;
  const expectedPass = process.env.DASHBOARD_PASSWORD;

  const back = (q: string) =>
    NextResponse.redirect(new URL(`/login${q}`, req.url), 303);

  if (!expectedUser || !expectedPass || !process.env.SESSION_SECRET) {
    return back("?error=config");
  }
  const ok = safeEqual(user, expectedUser) && safeEqual(pass, expectedPass);
  if (!ok) return back("?error=invalid");

  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(COOKIE, await createSession(user), cookieOptions);
  return res;
}
