import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, sealToken } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "").trim();
  const back = (q: string) => NextResponse.redirect(new URL(`/login${q}`, req.url), 303);

  if (!process.env.SESSION_SECRET) return back("?error=config");
  if (!token) return back("?error=invalid");

  const check = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  }).catch(() => null);
  if (!check?.ok) return back("?error=invalid");

  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(COOKIE, await sealToken(token), cookieOptions);
  return res;
}
