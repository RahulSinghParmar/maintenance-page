# Operations runbook

## Before deployment

Confirm the intended Cloudflare account, zone and existing Worker. Record the current deployment/version and route assignments. Run `npm run check`; validate runtime changes in a separate test environment. Preserve narrower application Worker routes and inspect origin/DNS behavior before adding catch-all coverage.

The existing documented Worker Route patterns are:

```text
*.parmar.homes/*
rahulsinghparmar.site/*
*.rahulsinghparmar.site/*
```

The portfolio apex pattern is separate from the wildcard pattern. Configure these as routes ahead of an existing origin. Do not replace them blindly with a fallback Worker Custom Domain. Bindings are not declared in `wrangler.json`; inspect actual dashboard settings first. Follow [Cloudflare routing documentation](https://developers.cloudflare.com/workers/configuration/routing/) when adapting this design.

`npx wrangler dev` is a runtime tool, not an accurate simulation of production same-zone routing by itself. `npx wrangler deploy` modifies the remote Worker and requires an intentional deployment decision. Embedded content changes require deployment; the checks workflow has no Cloudflare deployment credentials.

## Read-only verification

Inspect headers with a real GET while discarding the body:

```sh
curl -sS --max-time 20 -D - -o /dev/null https://office.parmar.homes/
```

During fallback expect 503, Retry-After 45, HTML content type and no-store directives. After recovery expect the application's normal response. A HEAD request does not exercise readable-body classification.

Use a dedicated test hostname for failure exercises; do not stop production solely to obtain a screenshot.

| Scenario | Expected |
| --- | --- |
| Healthy application route | Original response including body/headers |
| Legitimate missing route | Original 404 |
| Portfolio router removed with matching Traefik signature | Fallback 503 |
| Homelab application 404 | Original 404 |
| Listed error or fetch exception | Fallback 503 |
| HEAD during fallback | 503 with no body |
| Restored application | Normal response without cached maintenance HTML |

## Troubleshooting and rollback

- No fallback: confirm the request reaches the Worker and the route matches. Pre-Worker failures are outside its control.
- Application 404 remains: expected for homelab hosts; special matching is portfolio-only.
- Fallback persists: inspect the authorized private-origin, tunnel and proxy configuration. Browser reloads do not repair a service.
- GitHub changes absent: verify the deployed Worker version; the HTML is embedded.
- API receives HTML: current behavior, not a JSON API contract.

Record a known-good Worker version and use deployment history or an intentionally selected Wrangler rollback, following [Cloudflare's rollback guide](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/). A Worker rollback does not replace restoring separately changed DNS/routes/origin settings. Recheck healthy, missing-route and fallback cases afterward.
