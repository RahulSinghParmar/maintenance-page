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
      assert.deepEqual(calls, ["/unavailable"]);
    }
  );
});

test("preserves a real HTML portfolio 404", async () => {
  let calls = 0;

  await withFetch(
    async () => {
      calls += 1;
      return new Response("portfolio not found", {
        status: 404,
        headers: { "content-type": "text/html" }
      });
    },
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/real-missing-route")
      );

      assert.equal(response.status, 404);
      assert.equal(await response.text(), "portfolio not found");
      assert.equal(calls, 1);
    }
  );
});

test("preserves an unrelated plain-text portfolio 404", async () => {
  await withFetch(
    async () =>
      new Response("application route not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      }),
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/another-missing-route")
      );

      assert.equal(response.status, 404);
      assert.equal(await response.text(), "application route not found");
    }
  );
});

test("does not trust content length without matching the Traefik body", async () => {
  await withFetch(
    async () =>
      new Response("custom not-found xx", {
        status: 404,
        headers: {
          "content-length": "19",
          "content-type": "text/plain; charset=utf-8"
        }
      }),
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/custom-plain-404")
      );

      assert.equal(response.status, 404);
      assert.equal(await response.text(), "custom not-found xx");
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
    async () =>
      new Response(null, {
        status: 404,
        headers: {
          "content-length": "19",
          "content-type": "text/plain; charset=utf-8"
        }
      }),
    async () => {
      const response = await worker.fetch(
        new Request("https://rahulsinghparmar.site/", { method: "HEAD" })
      );

      assert.equal(response.status, 503);
      assert.equal(await response.text(), "");
    }
  );
});
