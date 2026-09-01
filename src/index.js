const FAILURE_STATUS_CODES = new Set([
  500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530
]);

const PORTFOLIO_ZONE = "rahulsinghparmar.site";
const HEALTH_PATH = "/api/health";
const RETRY_SECONDS = 45;

export default {
  async fetch(request) {
    try {
      const response = await fetch(request);

      if (FAILURE_STATUS_CODES.has(response.status)) {
        return serveMaintenancePage(request);
      }

      // When Coolify stops an application, Traefik removes its router and
      // returns a plain 404. Probe the portfolio health endpoint before
      // deciding whether that 404 belongs to the application or the origin.
      if (
        response.status === 404 &&
        ["GET", "HEAD"].includes(request.method) &&
        isPortfolioHostname(new URL(request.url).hostname) &&
        !(await portfolioOriginIsHealthy(request))
      ) {
        return serveMaintenancePage(request);
      }

      return response;
    } catch {
      return serveMaintenancePage(request);
    }
  }
};

function isPortfolioHostname(hostname) {
  return hostname === PORTFOLIO_ZONE || hostname.endsWith(`.${PORTFOLIO_ZONE}`);
}

async function portfolioOriginIsHealthy(request) {
  const healthUrl = new URL(request.url);
  healthUrl.pathname = HEALTH_PATH;
  healthUrl.search = "";
  healthUrl.hash = "";

  try {
    const response = await fetch(
      new Request(healthUrl, {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "manual"
      })
    );

    return (
      response.status === 200 &&
      (response.headers.get("content-type") || "").includes("application/json")
    );
  } catch {
    return false;
  }
}

function serveMaintenancePage(request) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname;
  const portfolioRequest = isPortfolioHostname(hostname);
  const identity = portfolioRequest ? "Rahul Singh Parmar" : "parmar.homes";
  const service = portfolioRequest ? "Portfolio" : "Self-hosted service";
  const supportSubject = encodeURIComponent(`${hostname} availability`);
  const observedAt = new Date().toISOString();

  const html = renderMaintenancePage({
    hostname,
    identity,
    service,
    supportSubject,
    observedAt,
    retryUrl: requestUrl.toString()
  });

  return new Response(request.method === "HEAD" ? null : html, {
    status: 503,
    headers: {
      "cache-control": "no-store, max-age=0",
      "cdn-cache-control": "no-store",
      "cloudflare-cdn-cache-control": "no-store",
      "content-language": "en",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "content-type": "text/html; charset=UTF-8",
      "cross-origin-resource-policy": "same-origin",
      "referrer-policy": "no-referrer",
      "retry-after": String(RETRY_SECONDS),
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-robots-tag": "noindex, nofollow, noarchive"
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMaintenancePage({
  hostname,
  identity,
  service,
  supportSubject,
  observedAt,
  retryUrl
}) {
  const safeHostname = escapeHtml(hostname);
  const safeIdentity = escapeHtml(identity);
  const safeService = escapeHtml(service);
  const safeObservedAt = escapeHtml(observedAt);
  const safeRetryUrl = escapeHtml(retryUrl);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta http-equiv="refresh" content="${RETRY_SECONDS}">
  <meta name="theme-color" content="#f3f1e9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0b0c0c" media="(prefers-color-scheme: dark)">
  <title>${safeHostname} | Temporarily unavailable</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f3f1e9;
      --panel: rgba(255, 255, 255, .72);
      --text: #161814;
      --muted: #60645d;
      --line: rgba(22, 24, 20, .16);
      --accent: #a64b2a;
      --accent-soft: rgba(166, 75, 42, .10);
      --ok: #18794e;
      --warn: #9a6700;
      --shadow: 0 24px 80px rgba(42, 38, 30, .12);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0c0c;
        --panel: rgba(20, 22, 21, .82);
        --text: #f1efe7;
        --muted: #a9ada5;
        --line: rgba(241, 239, 231, .14);
        --accent: #e58a61;
        --accent-soft: rgba(229, 138, 97, .12);
        --ok: #6bd6a3;
        --warn: #f0bd66;
        --shadow: 0 28px 90px rgba(0, 0, 0, .36);
      }
    }
    * { box-sizing: border-box; }
    html { min-width: 280px; background: var(--bg); }
    body {
      min-height: 100vh;
      margin: 0;
      padding: clamp(20px, 4vw, 52px);
      display: grid;
      place-items: center;
      overflow-x: hidden;
      color: var(--text);
      background:
        radial-gradient(circle at 14% 16%, var(--accent-soft), transparent 34%),
        linear-gradient(145deg, var(--bg), color-mix(in srgb, var(--bg) 88%, var(--accent)));
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(100%, 880px);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: clamp(24px, 6vw, 64px);
      background: var(--panel);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }
    .eyebrow, .meta, footer {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 34px;
      color: var(--accent);
      font-size: .76rem;
      font-weight: 700;
    }
    .pulse {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent);
      animation: pulse 2.4s ease-out infinite;
    }
    h1 {
      max-width: 13ch;
      margin: 0;
      font-size: clamp(2.4rem, 8vw, 5.8rem);
      font-weight: 650;
      letter-spacing: -.065em;
      line-height: .95;
    }
    .lede {
      max-width: 62ch;
      margin: 28px 0 0;
      color: var(--muted);
      font-size: clamp(1rem, 2.2vw, 1.2rem);
      line-height: 1.7;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: 42px 0 0;
      border-block: 1px solid var(--line);
    }
    .status-grid div { padding: 20px 18px 20px 0; }
    .status-grid div + div { padding-left: 18px; border-left: 1px solid var(--line); }
    dt { color: var(--muted); font-size: .76rem; text-transform: uppercase; letter-spacing: .08em; }
    dd { margin: 8px 0 0; font-weight: 650; }
    .online { color: var(--ok); }
    .offline { color: var(--warn); }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
    a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 10px 18px;
      color: var(--text);
      text-decoration: none;
      font-weight: 650;
    }
    a.primary { border-color: var(--accent); background: var(--accent); color: var(--bg); }
    a:hover { border-color: var(--accent); }
    a:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
    footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px 20px;
      margin-top: 38px;
      color: var(--muted);
      font-size: .68rem;
      line-height: 1.6;
    }
    @keyframes pulse {
      70%, 100% { box-shadow: 0 0 0 12px transparent; }
    }
    @media (max-width: 640px) {
      .status-grid { grid-template-columns: 1fr; }
      .status-grid div { padding: 16px 0; }
      .status-grid div + div { padding-left: 0; border-left: 0; border-top: 1px solid var(--line); }
      .actions a { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pulse { animation: none; }
      html { scroll-behavior: auto; }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow"><span class="pulse" aria-hidden="true"></span> Edge fallback active</p>
    <h1>Temporarily unavailable.</h1>
    <p class="lede">The ${safeService.toLowerCase()} cannot currently reach its private origin. Cloudflare is serving this page from the edge while connectivity, the host, or the application recovers. No action is required from you.</p>

    <dl class="status-grid" aria-label="Availability status">
      <div><dt>Cloudflare edge</dt><dd class="online">Online</dd></div>
      <div><dt>${safeService} origin</dt><dd class="offline">Unavailable</dd></div>
      <div><dt>Recovery</dt><dd>Automatic retry</dd></div>
    </dl>

    <div class="actions">
      <a class="primary" href="${safeRetryUrl}">Try again</a>
      <a href="mailto:rahulsinghparmar4@protonmail.com?subject=${supportSubject}">Contact Rahul</a>
    </div>

    <footer>
      <span>${safeIdentity} / ${safeHostname}</span>
      <span>HTTP 503 · Retry in ${RETRY_SECONDS}s</span>
      <span>Observed ${safeObservedAt}</span>
    </footer>
  </main>
</body>
</html>`;
}
