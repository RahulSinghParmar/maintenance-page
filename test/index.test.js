import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

for (const status of [500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]) {
  test(`returns fallback for configured failure status ${status}`, async () => {
    await withFetch(async () => new Response("origin error", { status }), async () => {
      const response = await worker.fetch(new Request("https://office.parmar.homes/"));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("retry-after"), "45");
    });
  });
}

for (const status of [200, 302, 401, 429, 501]) {
  test(`preserves the entire origin response for status ${status}`, async () => {
    const origin = new Response("application response", {
      status,
      headers: { "x-application": "original", "cache-control": "private", location: "/login" }
    });
    await withFetch(async () => origin, async () => {
      const response = await worker.fetch(new Request("https://office.parmar.homes/"));
      assert.equal(response, origin);
      assert.equal(response.headers.get("x-application"), "original");
      assert.equal(await response.text(), "application response");
    });
  });
}

test("forwards a POST once without replaying the submitted body", async () => {
  let calls = 0;
  await withFetch(async request => {
    calls += 1;
    assert.equal(request.method, "POST");
    assert.equal(await request.text(), "example=value");
    return new Response("unavailable", { status: 502 });
  }, async () => {
    const response = await worker.fetch(new Request("https://office.parmar.homes/submit", {
      method: "POST", body: "example=value"
    }));
    assert.equal(response.status, 503);
    assert.equal(calls, 1);
  });
});

test("fallback retains the complete security/cache contract without remote assets", async () => {
  await withFetch(async () => new Response("unavailable", { status: 503 }), async () => {
    const response = await worker.fetch(new Request("https://office.parmar.homes/"));
    for (const header of ["cdn-cache-control", "cloudflare-cdn-cache-control"]) assert.equal(response.headers.get(header), "no-store");
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
    assert.equal(response.headers.get("content-type"), "text/html; charset=UTF-8");
    const html = await response.text();
    assert.match(html, /office.parmar.homes/);
    assert.match(html, /prefers-reduced-motion/);
    assert.doesNotMatch(html, /<script|<img|<link[^>]+stylesheet/i);
  });
});

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
