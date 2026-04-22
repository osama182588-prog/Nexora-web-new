/**
 * Server-Sent Events stream — the realtime channel from the in-process
 * bus to every connected browser.
 *
 * SSE was chosen over WebSocket for a few reasons:
 *  - it works over plain HTTP (no upgrade), so it slots cleanly into
 *    Next.js App Router route handlers and Edge/Node runtimes;
 *  - the browser auto-reconnects with exponential backoff;
 *  - we only need server → client push for the live UI.
 *
 * The stream filters events to those owned by the authenticated caller
 * — a user only sees events their own actions produced (or those whose
 * resources they own). This keeps the channel privacy-safe even though
 * the bus itself is global.
 */
import { type NextRequest } from "next/server";
import { requireUserId } from "@/lib/api";
import { bus, type SystemEvent } from "@/lib/system/bus";
import { ensureOperator, operatorState } from "@/lib/system/operator";
import { ensureExternalIntegration } from "@/modules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

function format(event: SystemEvent): string {
  // The event id makes the browser send Last-Event-ID on reconnect,
  // letting us avoid duplicates if we ever add server-side replay.
  const data = JSON.stringify(event);
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${data}\n\n`;
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const userId = auth.userId;

  // Make sure the operator (audit log subscriber) is wired up.
  ensureOperator();
  // And the modules dispatcher (bus → external integration modules).
  ensureExternalIntegration();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Initial retry hint + operator snapshot so the client can render
      // the connection state immediately.
      send(`retry: 3000\n\n`);
      send(
        `event: ready\ndata: ${JSON.stringify({
          userId,
          operator: operatorState()
        })}\n\n`
      );

      // Backfill the most recent events the user owns so a fresh tab
      // shows context without round-tripping to REST.
      for (const e of bus.recent()) {
        if (e.actorId === userId) send(format(e));
      }

      const unsubscribe = bus.subscribe((event) => {
        if (event.actorId !== userId) return;
        send(format(event));
      });

      // SSE heartbeat — comment lines keep the connection alive through
      // proxies that idle-out HTTP after ~30s.
      const heartbeat = setInterval(() => {
        send(`: keepalive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      // Tear down on client disconnect. The signal fires even if the
      // browser closes the tab abruptly.
      const onAbort = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable nginx-style buffering on platforms that respect it.
      "X-Accel-Buffering": "no"
    }
  });
}
