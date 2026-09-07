# Cloudflare maintenance fallback

An edge-hosted fallback for Rahul Singh Parmar's self-hosted services and portfolio. The Worker proxies healthy requests unchanged and returns a self-contained HTTP `503` page when the tunnel, reverse proxy, host, or application origin is unavailable.

## How a stopped portfolio is detected

When Coolify stops the portfolio container, Traefik removes its router and returns its default HTTP response: `404`, `Content-Type: text/plain`, and the 19-byte body `404 page not found`. The Worker matches that precise signature without making a second request through the same route.

- Exact Traefik default `404` signature on a portfolio hostname: return the maintenance page with HTTP `503`.
- Any other application `404`: preserve the original response unchanged.
- Origin status `500`, `502`, `503`, `504`, `520`, `521`, `522`, `523`, `524`, `525`, `526`, or `530`: return the maintenance page immediately.
- Network exception: return the maintenance page immediately.

The Traefik-signature behavior is intentionally limited to `rahulsinghparmar.site`; unrelated `parmar.homes` applications keep their normal `404` behavior. This avoids same-zone Worker recursion and does not add an extra origin request to ordinary traffic.

## Required Worker routes

Configure these as **Routes**, not Custom Domains:

```text
*.parmar.homes/*
rahulsinghparmar.site/*
*.rahulsinghparmar.site/*
```

The exact apex route is required because `*.rahulsinghparmar.site/*` does not match `rahulsinghparmar.site` itself. Keep more-specific application Worker routes above or outside this catch-all design when adding future Workers.

## Response contract

The fallback returns:

- HTTP `503 Service Unavailable`
- `Retry-After: 45`
- no-store cache directives for browsers and Cloudflare
- `X-Robots-Tag: noindex, nofollow, noarchive`
- restrictive CSP, framing, referrer and content-type headers
- a responsive, accessible, light/dark-aware page with no external assets

The HTML does not claim that Docker, the tunnel, or the reverse proxy is in a particular state. It only reports what the Worker can prove: Cloudflare's edge is responding and the private origin is unavailable.

## Development

```bash
npx wrangler dev
npx wrangler deploy
```

After deployment, test both conditions:

1. With the portfolio healthy, verify a real missing route remains the portfolio's own `404` page.
2. Stop the Coolify application, then verify the apex and `www` resolve to the maintenance response with HTTP `503` and `Retry-After: 45`.

Do not cache the maintenance response and do not enable an "always maintenance" Custom Domain for the zone.
