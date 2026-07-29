import { describe, expect, it } from "vitest";
import http from "node:http";

import localApi from "./local-api.cjs";

const { localApiAnswers, waitForLocalApi } = localApi;

/** A server on an ephemeral port, closed by the caller. */
function listen() {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, port: server.address().port }),
    );
  });
}

describe("localApiAnswers", () => {
  it("counts any response, including 404", async () => {
    // The question is whether something is listening, not whether a route exists.
    const { server, port } = await listen();
    try {
      expect(await localApiAnswers({ port })).toBe(true);
    } finally {
      server.close();
    }
  });

  it("is false when nothing is listening", async () => {
    const { server, port } = await listen();
    await new Promise((r) => server.close(r));
    expect(await localApiAnswers({ port })).toBe(false);
  });
});

describe("waitForLocalApi", () => {
  it("returns as soon as the port answers", async () => {
    const { server, port } = await listen();
    try {
      expect(await waitForLocalApi({ port, timeoutMs: 5000 })).toBe(true);
    } finally {
      server.close();
    }
  });

  it("waits for a port that comes up late", async () => {
    // The real case: the backend is forking while the switch is being reported.
    const { server, port } = await listen();
    await new Promise((r) => server.close(r));

    let late;
    setTimeout(() => {
      late = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end();
      });
      late.listen(port, "127.0.0.1");
    }, 400);

    try {
      expect(
        await waitForLocalApi({ port, timeoutMs: 5000, intervalMs: 100 }),
      ).toBe(true);
    } finally {
      late?.close();
    }
  });

  it("gives up rather than hanging when the port never opens", async () => {
    // `startBackendServer` resolves true on a 15s timer whether or not anything
    // is listening; this is the check that makes the claim true, so it must
    // terminate on its own.
    const { server, port } = await listen();
    await new Promise((r) => server.close(r));

    const started = Date.now();
    expect(
      await waitForLocalApi({ port, timeoutMs: 600, intervalMs: 100 }),
    ).toBe(false);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
