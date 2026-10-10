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
        <input
          name="token"
          type="password"
          placeholder="GitHub personal access token"
          autoComplete="off"
          required
        />
        <button type="submit">Sign in</button>
        {error === "invalid" && <span className="err">GitHub rejected that token.</span>}
        {error === "config" && <span className="err">Server is missing SESSION_SECRET.</span>}
      </form>

      <h2>How to get a token</h2>
      <ol className="steps">
        <li>
          Open{" "}
          <a href="https://github.com/settings/tokens/new?scopes=repo,read:user,user,read:org&description=Actions%20Dashboard" target="_blank" rel="noreferrer">
            github.com/settings/tokens/new
          </a>{" "}
          (Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → Generate new token (classic)).
        </li>
        <li>Name it (e.g. “Actions Dashboard”) and pick an expiration.</li>
        <li>
          Tick the scopes: <code>repo</code>, <code>read:user</code>, <code>user</code> and <code>read:org</code>. The link
          above pre-selects them.
        </li>
        <li>Click <b>Generate token</b> and copy it (starts with <code>ghp_</code>). GitHub shows it only once.</li>
        <li>Paste it above and sign in.</li>
      </ol>
      <p className="small mut">
        Use a <b>classic</b> token: fine-grained tokens can’t read Actions billing. Your token is stored only in an
        encrypted, HTTP-only cookie and is never exposed to the browser’s JavaScript.
      </p>
    </main>
  );
}
