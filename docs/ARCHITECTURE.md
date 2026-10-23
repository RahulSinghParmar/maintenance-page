# Architecture and boundaries

| File | Responsibility |
| --- | --- |
| `src/index.js` | Origin fetch, classification, embedded HTML/CSS and fallback headers |
| `test/index.test.js` | Regression suite using mocked origin requests |
| `wrangler.json` | Worker name, entry point, compatibility date and observability |
| `.github/workflows/check.yml` | Credential-free Node checks |

The configured Worker is `maintenance-page`, entry point `src/index.js`, compatibility date `2024-01-01`, with observability enabled. No KV, R2, D1 or GitHub template fetch appears in this implementation. Production routes are not declared in this configuration.

## Request flow

The Worker calls `fetch(request)` once. Selected failure statuses become the fallback; other responses retain their body/status/headers. It does not issue a second health probe or replay POST requests.

The portfolio 404 heuristic applies only to GET/HEAD requests. It checks plain-text content, rejects an advertised content length other than 19, and compares the trimmed readable body to `404 page not found`. Without a readable body it uses content-length metadata. A legitimate response with the same signature can be misclassified. If Content-Length is absent, the current clone-and-text read is not explicitly bounded. Homelab 404s are never reinterpreted.

## HTTP and page behavior

The fallback uses HTTP 503, Retry-After 45, browser and CDN no-store headers and an X-Robots-Tag preventing indexing. CSP blocks scripts, external assets, forms, framing and base URL changes while allowing inline CSS. Other headers include no-referrer, nosniff and same-origin resource policy.

The page escapes request-derived strings, displays the requested hostname and a UTC observation timestamp, and includes a mailto contact. The retry link retains the original URL, including query parameters: do not publish authenticated URLs or tokens in examples or captures.

The 45-second meta refresh is browser navigation, not a background health probe or restoration guarantee. Browser behavior after a failed form submission should be considered before broadening this design.

## Limits

- Cannot distinguish tunnel, network, reverse-proxy and application failures from the response alone.
- Cannot replace failures occurring before Worker execution.
- Only listed statuses are replaced; 501 and 507, for example, currently pass through.
- API clients receive HTML too; JSON fallback requires an explicit future contract.
- No configurable upstream deadline, circuit breaker or last-known-good snapshot.
- Node tests do not reproduce Workers routing, streaming and platform-specific exceptions.

## Cloudflare references

- [Routes and domains](https://developers.cloudflare.com/workers/configuration/routing/): routes sit before an existing origin; Custom Domains treat the Worker as an origin.
- [Compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/): older dates remain supported; review and test changes before upgrading.
- [Versions and deployments](https://developers.cloudflare.com/workers/versions-and-deployments/): a version is distinct from the deployment serving traffic.
