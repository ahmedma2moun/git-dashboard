import { getRepos, getRuns, getUsage, getViewer, runMinutes, type Run, type Usage } from "@/lib/github";

export const dynamic = "force-dynamic";

const fmt = (n: number) => Math.round(n).toLocaleString();
const ago = (d: string) => {
  const m = (Date.now() - Date.parse(d)) / 60000;
  if (m < 60) return `${Math.max(1, Math.round(m))}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
const statusClass = (r: Run) =>
  r.conclusion === "success" ? "s-success" : r.conclusion === "failure" ? "s-failure" : "s-other";

function UsageCard({ u }: { u: Usage }) {
  const pct = u.included ? Math.min(100, (u.used / u.included) * 100) : 0;
  return (
    <div className="card">
      <div className="label">
        {u.owner} · {u.plan} plan
      </div>
      {u.source === "unavailable" ? (
        <p className="mut small">
          Billing unavailable: {u.error}. Token needs the <code>user</code> scope (or <code>read:org</code> for orgs).
        </p>
      ) : (
        <>
          <div className="big">
            {u.remaining === null ? "—" : fmt(u.remaining)} <span className="mut small">min left</span>
          </div>
          <div className="bar">
            <i className={pct > 90 ? "bad" : pct > 70 ? "warn" : ""} style={{ width: `${pct}%` }} />
          </div>
          <div className="small mut">
            {fmt(u.used)} used of {u.included === null ? "?" : fmt(u.included)} included
            {u.paid > 0 && <> · {fmt(u.paid)} paid</>}
          </div>
          <div className="small mut">
            {Object.entries(u.breakdown)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${k.toLowerCase()} ${fmt(v)}`)
              .join(" · ") || "no usage this month"}
          </div>
        </>
      )}
    </div>
  );
}

export default async function Dashboard() {
  let data;
  try {
    const [viewer, repos] = await Promise.all([getViewer(), getRepos()]);
    const orgs = (process.env.GITHUB_ORGS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const usages = await Promise.all([
      getUsage(viewer.login, "user", viewer.plan?.name ?? "free"),
      ...orgs.map((o) => getUsage(o, "org", "team")),
    ]);
    const active = repos.filter((r) => !r.archived).slice(0, 30);
    const runsByRepo = await Promise.all(active.map((r) => getRuns(r)));
    data = { viewer, repos, usages, active, runsByRepo };
  } catch (e) {
    return (
      <main className="wrap">
        <h1>GitHub Dashboard</h1>
        <p className="err">{(e as Error).message}</p>
        <p className="mut">Check GITHUB_TOKEN in your environment variables.</p>
      </main>
    );
  }
  const { viewer, repos, usages, active, runsByRepo } = data;
  const recent = active
    .flatMap((repo, i) => runsByRepo[i].map((run) => ({ repo, run })))
    .sort((a, b) => Date.parse(b.run.created_at) - Date.parse(a.run.created_at))
    .slice(0, 25);
  const failing = recent.filter((x) => x.run.conclusion === "failure").length;

  return (
    <main className="wrap">
      <header>
        <h1>GitHub Actions Dashboard</h1>
        <div className="who">
          <img src={viewer.avatar_url} alt="" />
          {viewer.login}
          <form method="post" action="/api/logout">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <div className="label">Repositories</div>
          <div className="big">{repos.length}</div>
          <div className="small mut">{repos.filter((r) => r.private).length} private</div>
        </div>
        <div className="card">
          <div className="label">Recent runs</div>
          <div className="big">{recent.length}</div>
          <div className="small mut">{failing} failed (latest 25)</div>
        </div>
      </div>

      <h2>Actions minutes (this month)</h2>
      <div className="grid">
        {usages.map((u) => (
          <UsageCard key={u.owner} u={u} />
        ))}
      </div>
      <p className="small mut">
        Included minutes are weighted by runner OS (Windows ×2, macOS ×10). Private repos only consume minutes.
      </p>

      <h2>Latest workflow runs</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Repo</th><th>Workflow</th><th>Status</th><th>Branch</th><th>Duration</th><th>When</th></tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={6} className="mut">No workflow runs found.</td></tr>
            )}
            {recent.map(({ repo, run }) => (
              <tr key={run.id}>
                <td>{repo.full_name}</td>
                <td><a href={run.html_url} target="_blank" rel="noreferrer">{run.name ?? run.display_title}</a></td>
                <td className={statusClass(run)}>{run.conclusion ?? run.status}</td>
                <td className="mut">{run.head_branch}</td>
                <td className="mut">{run.conclusion ? `${runMinutes(run).toFixed(1)}m` : "—"}</td>
                <td className="mut">{ago(run.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Repositories</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Name</th><th>Language</th><th>Stars</th><th>Last push</th><th>Last run</th></tr>
          </thead>
          <tbody>
            {repos.map((r) => {
              const i = active.indexOf(r);
              const last = i >= 0 ? runsByRepo[i][0] : undefined;
              return (
                <tr key={r.id}>
                  <td>
                    <a href={r.html_url} target="_blank" rel="noreferrer">{r.full_name}</a>{" "}
                    {r.private && <span className="pill">private</span>}{" "}
                    {r.fork && <span className="pill">fork</span>}{" "}
                    {r.archived && <span className="pill">archived</span>}
                    {r.description && <div className="small mut">{r.description}</div>}
                  </td>
                  <td className="mut">{r.language ?? "—"}</td>
                  <td className="mut">{r.stargazers_count}</td>
                  <td className="mut">{ago(r.pushed_at)}</td>
                  <td className={last ? statusClass(last) : "mut"}>{last ? (last.conclusion ?? last.status) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
