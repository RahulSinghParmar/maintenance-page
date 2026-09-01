import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

async function withFetch(mock, operation) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;

  try {
    await operation();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("returns maintenance for a stopped portfolio route", async () => {
  const calls = [];

  await withFetch(
    async (input) => {
      const url = new URL(input.url || input);
      calls.push(url.pathname);
      return new Response("404 page not found", {
        status: 404,
        headers: { "content-type": "text/plain" }
      });
    },
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/unavailable")
      );

      assert.equal(response.status, 503);
      assert.equal(response.headers.get("retry-after"), "45");
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
      assert.match(await response.text(), /Portfolio origin/);
      assert.deepEqual(calls, ["/unavailable", "/api/health"]);
    }
  );
});

test("preserves a real portfolio 404 while the application is healthy", async () => {
  let call = 0;

  await withFetch(
    async () => {
      call += 1;
      return call === 1
        ? new Response("portfolio not found", {
            status: 404,
            headers: { "content-type": "text/html" }
          })
        : Response.json({ status: "ok" });
    },
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/real-missing-route")
      );

      assert.equal(response.status, 404);
      assert.equal(await response.text(), "portfolio not found");
      assert.equal(call, 2);
    }
  );
});

test("does not reinterpret parmar.homes application 404 responses", async () => {
  let calls = 0;

  await withFetch(
    async () => {
      calls += 1;
      return new Response("service not found", { status: 404 });
    },
    async () => {
      const response = await worker.fetch(
        new Request("https://dash.parmar.homes/missing")
      );

      assert.equal(response.status, 404);
      assert.equal(calls, 1);
    }
  );
});

test("returns maintenance for Cloudflare and origin failure statuses", async () => {
  await withFetch(
    async () => new Response("origin error", { status: 522 }),
    async () => {
      const response = await worker.fetch(
        new Request("https://dash.parmar.homes/")
      );

      assert.equal(response.status, 503);
      assert.match(await response.text(), /Self-hosted service origin/);
    }
  );
});

test("returns maintenance when the origin request throws", async () => {
  await withFetch(
    async () => {
      throw new Error("tunnel unavailable");
    },
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/")
      );

      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    }
  );
});

test("returns an empty maintenance body for HEAD requests", async () => {
  await withFetch(
    async () => new Response(null, { status: 503 }),
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/", { method: "HEAD" })
      );

      assert.equal(response.status, 503);
      assert.equal(await response.text(), "");
    }
  );
});
