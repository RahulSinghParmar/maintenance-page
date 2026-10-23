# Security

Use GitHub private vulnerability reporting if available, or the maintainer's profile contact, for security defects. Do not post credentials, authenticated URLs or private infrastructure logs in public issues.

The repository declares no production secrets. Observability is enabled, but retention/sampling/access settings depend on the real Cloudflare account. Request URLs can contain sensitive query parameters; exclude them from public examples and screenshots. The fallback is not an authentication or access-control layer.
