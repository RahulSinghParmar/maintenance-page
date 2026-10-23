# Contributing

Run `npm run check` on a supported Node.js release. Add regression cases for changed request/response behavior. Preserve healthy responses, legitimate 404s, single-fetch behavior and the no-store/503 contract.

Keep external dependencies out of the fallback page, escape request-derived strings and avoid exposing tokens/private URLs in examples. Document changes to routing, retries, response format or compatibility assumptions. Production exercises and Worker deployments require an intentional operational decision; repository CI does not deploy.
