export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <h1>GitHub Dashboard</h1>
      <form method="post" action="/api/login">
        <input name="username" placeholder="Username" autoComplete="username" required />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
        <button type="submit">Sign in</button>
        {error === "invalid" && <span className="err">Invalid credentials.</span>}
        {error === "config" && (
          <span className="err">Server is missing DASHBOARD_USERNAME / DASHBOARD_PASSWORD / SESSION_SECRET.</span>
        )}
      </form>
    </main>
  );
}
