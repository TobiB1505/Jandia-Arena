import { useEffect, useRef, useState } from "react";

/**
 * Subscribes to the live-control stream and falls back to a 3-second REST
 * poll if the stream fails. Order of preference:
 *   1. Server-Sent Events  (/api/control/stream)  – works through any
 *      HTTP/1.1 proxy, including the K8s ingress this app runs behind.
 *   2. REST polling         (/api/control/state) – always-on safety net.
 *
 * Returns the latest control snapshot or null while loading.
 */
const POLL_INTERVAL = 3000;
const SSE_RECONNECT_BASE = 1500;
const SSE_RECONNECT_MAX = 10000;

export default function useControlState() {
  const [state, setState] = useState(null);
  const esRef = useRef(null);
  const reconnectMsRef = useRef(SSE_RECONNECT_BASE);
  const closedRef = useRef(false);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    const sseUrl = base + "/api/control/stream";
    const restUrl = base + "/api/control/state";

    const fetchRest = async () => {
      try {
        const res = await fetch(restUrl);
        if (res.ok) setState(await res.json());
      } catch {
        /* ignore */
      }
    };

    const openStream = () => {
      if (closedRef.current) return;
      try {
        const es = new EventSource(sseUrl);
        esRef.current = es;
        es.onopen = () => {
          reconnectMsRef.current = SSE_RECONNECT_BASE;
        };
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            setState(data);
          } catch {
            /* ignore malformed */
          }
        };
        es.onerror = () => {
          // EventSource auto-reconnects on its own; only force-recreate if
          // it ended up in CLOSED state.
          if (es.readyState === EventSource.CLOSED) {
            try { es.close(); } catch { /* ignore */ }
            const ms = reconnectMsRef.current;
            reconnectMsRef.current = Math.min(ms * 2, SSE_RECONNECT_MAX);
            reconnectTimerRef.current = setTimeout(openStream, ms);
          }
        };
      } catch {
        /* fall back to polling */
      }
    };

    fetchRest();
    openStream();
    const t = setInterval(fetchRest, POLL_INTERVAL);

    return () => {
      closedRef.current = true;
      clearInterval(t);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try { esRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  return state;
}
