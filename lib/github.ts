import { cookies } from "next/headers";
import { COOKIE, openToken } from "./session";

const API = "https://api.github.com";

async function gh<T>(path: string, _revalidate = 0): Promise<T> {
  const token = await openToken((await cookies()).get(COOKIE)?.value);
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store", // per-user token: never share cached responses
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const scopes = res.headers.get("x-oauth-scopes");
    throw new Error(
      `GitHub ${res.status} on ${path}: ${body.message ?? ""}${scopes !== null ? ` (token scopes: ${scopes || "none"})` : ""}`,
    );
  }
  return res.json() as Promise<T>;
}

export type Repo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  owner: { login: string };
};

export type Run = {
  id: number;
  name: string | null;
  display_title: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  head_branch: string | null;
  event: string;
  created_at: string;
  run_started_at?: string;
  updated_at: string;
};

export type Viewer = { login: string; avatar_url: string; plan?: { name: string } };

export type Usage = {
  owner: string;
  kind: "user" | "org";
  plan: string;
  included: number | null; // minutes
  used: number; // minutes (multiplier-weighted)
  breakdown: Record<string, number>; // raw minutes by runner OS
  paid: number;
  remaining: number | null;
  source: "usage-report" | "legacy" | "unavailable";
  error?: string;
};

const INCLUDED: Record<string, number> = {
  free: 2000,
  pro: 3000,
  team: 3000,
  enterprise: 50000,
};
const MULT: Record<string, number> = { LINUX: 1, UBUNTU: 1, WINDOWS: 2, MACOS: 10 };

export const getViewer = () => gh<Viewer>("/user");

export async function getRepos(): Promise<Repo[]> {
  const all: Repo[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh<Repo[]>(
      `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
    );
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function getRuns(repo: Repo, n = 5): Promise<Run[]> {
  try {
    const r = await gh<{ workflow_runs: Run[] }>(
      `/repos/${repo.full_name}/actions/runs?per_page=${n}`,
      60,
    );
    return r.workflow_runs;
  } catch {
    return [];
  }
}

export function runMinutes(r: Run): number {
  const s = Date.parse(r.run_started_at ?? r.created_at);
  const e = Date.parse(r.updated_at);
  return Math.max(0, (e - s) / 60000);
}

type UsageItem = { product: string; sku: string; unitType: string; quantity: number };

function osOf(sku: string): string {
  const s = sku.toUpperCase();
  if (s.includes("MACOS")) return "MACOS";
  if (s.includes("WINDOWS")) return "WINDOWS";
  return "LINUX";
}

export async function getUsage(
  owner: string,
  kind: "user" | "org",
  plan: string,
): Promise<Usage> {
  const base = kind === "user" ? `/users/${owner}` : `/organizations/${owner}`;
  const included = INCLUDED[plan.toLowerCase()] ?? null;
  const now = new Date();
  const out: Usage = {
    owner,
    kind,
    plan,
    included,
    used: 0,
    breakdown: {},
    paid: 0,
    remaining: included,
    source: "unavailable",
  };

  try {
    // Enhanced billing platform
    const q = `year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`;
    const r = await gh<{ usageItems: UsageItem[] }>(
      `${base}/settings/billing/usage?${q}`,
      300,
    );
    for (const it of r.usageItems) {
      if (it.product?.toLowerCase() !== "actions" || it.unitType !== "Minutes") continue;
      const os = osOf(it.sku);
      out.breakdown[os] = (out.breakdown[os] ?? 0) + it.quantity;
      out.used += it.quantity * (MULT[os] ?? 1);
    }
    out.source = "usage-report";
  } catch (e1) {
    try {
      // Legacy billing endpoint
      const r = await gh<{
        total_minutes_used: number;
        total_paid_minutes_used: number;
        included_minutes: number;
        minutes_used_breakdown: Record<string, number>;
      }>(`${base}/settings/billing/actions`, 300);
      out.used = r.total_minutes_used;
      out.paid = r.total_paid_minutes_used;
      out.included = r.included_minutes;
      out.breakdown = Object.fromEntries(
        Object.entries(r.minutes_used_breakdown ?? {}).map(([k, v]) => [k.toUpperCase(), v]),
      );
      out.source = "legacy";
    } catch (e2) {
      out.error = `${(e1 as Error).message} | legacy: ${(e2 as Error).message}`;
    }
  }

  if (out.included !== null) {
    out.remaining = Math.max(0, out.included - out.used);
    out.paid = out.paid || Math.max(0, out.used - out.included);
  }
  return out;
}
