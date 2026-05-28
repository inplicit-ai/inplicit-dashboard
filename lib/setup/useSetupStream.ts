"use client";

import { useCallback, useRef, useState } from "react";

/** Events emitted by the setup-agent SSE stream (mirrors backend setup/mod.rs). */
export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; tool: string; args: Record<string, unknown>; revision?: number; applied?: boolean }
  | { type: "error"; code: string; tool?: string }
  | { type: "done"; revision?: number; config?: unknown };

type Handlers = {
  onToken?: (text: string) => void;
  onToolCall?: (e: Extract<StreamEvent, { type: "tool_call" }>) => void;
  onError?: (e: Extract<StreamEvent, { type: "error" }>) => void;
  onDone?: (e: Extract<StreamEvent, { type: "done" }>) => void;
};

/**
 * Drives one agent turn over SSE. POSTs the message to the unbuffered
 * /dapi/setup-stream/:id route and parses `event:`/`data:` frames. Returns a
 * `send` fn and a `streaming` flag. Aborts any in-flight turn before a new one.
 */
export function useSetupStream(sessionId: string, handlers: Handlers) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Keep the latest handlers without re-creating `send`.
  const hRef = useRef(handlers);
  hRef.current = handlers;

  const send = useCallback(
    async (message: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStreaming(true);

      try {
        const res = await fetch(`/dapi/setup-stream/${sessionId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          hRef.current.onError?.({ type: "error", code: "request_failed" });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          let sep: number;
          while ((sep = buf.indexOf("\n\n")) !== -1) {
            const frame = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            dispatchFrame(frame, hRef.current);
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          hRef.current.onError?.({ type: "error", code: "stream_failed" });
        }
      } finally {
        setStreaming(false);
      }
    },
    [sessionId],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { send, cancel, streaming };
}

function dispatchFrame(frame: string, h: Handlers) {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  switch (event) {
    case "token":
      h.onToken?.(String(payload.text ?? ""));
      break;
    case "tool_call":
      h.onToolCall?.({
        type: "tool_call",
        tool: String(payload.tool ?? ""),
        args: (payload.args as Record<string, unknown>) ?? {},
        revision: payload.revision as number | undefined,
        applied: payload.applied as boolean | undefined,
      });
      break;
    case "error":
      h.onError?.({
        type: "error",
        code: String(payload.code ?? "unknown"),
        tool: payload.tool as string | undefined,
      });
      break;
    case "done":
      h.onDone?.({
        type: "done",
        revision: payload.revision as number | undefined,
        config: payload.config,
      });
      break;
  }
}
