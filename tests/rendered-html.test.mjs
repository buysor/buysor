import assert from "node:assert/strict";
import test from "node:test";

const productMeta = /<meta(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["'][^"']+["'])[^>]*>/i;

test("renders production product metadata and working navigation", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, productMeta);
  assert.match(html, /<title>BUYSOR/);
  assert.match(html, /href="\/credits"/);
  assert.match(html, /href="\/pricing"/);
  assert.match(html, /id="decision-example"/);
  assert.doesNotMatch(html, /name="codex-preview"/);
});
