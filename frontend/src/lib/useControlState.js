import { useEffect, useRef, useState } from "react";

/**
 * Subscribes to the live-control stream and falls back to REST polling if
 * the stream fails. Order of preference:
 *   1. Server-Sent Events  (/api/control/stream) – preferred, real-time push.
 *   2. REST polling         (/api/control/state) – safety net.
 *
 * When SSE is open the polling interval is relaxed to 30 s (keep-alive only).
 * If SSE is closed it falls back to 3 s polling for low-latency reactions.
 *
 * Returns the latest control snapshot enriched with `_sseConnected: boolean`,
 * or null while loading.
 */
const POLL_FAST = 3000;   // SSE down: fast polling
const POLL_SLOW = 30000;  // SSE up: keep-alive polling
const SSE_RECONNECT_BASE = 1500;
const SSE_RECONNECT_MAX = 10000;

export default function useControlState() {
  const [state, setState] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef(null);
  const reconnectMsRef = useRef(SSE_RECONNECT_BASE);
  const closedRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const pollIntervalRef = useRef(POLL_FAST);

  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    const sseUrl = base + "/api/control/stream";
    const restUrl = base + "/api/control/state";

    const fetchRest = async () => {
      try {
        const res = await fetch(restUrl);
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch {
        /* ignore */
      }
    };

    const setPollInterval = (ms) => {
      if (pollIntervalRef.current === ms && pollTimerRef.current) return;
      pollIntervalRef.current = ms;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(fetchRest, ms);
    };

    const openStream = () => {
      if (closedRef.current) return;
      try {
        const es = new EventSource(sseUrl);
        esRef.current = es;
        es.onopen = () => {
          reconnectMsRef.current = SSE_RECONNECT_BASE;
          setSseConnected(true);
          setPollInterval(POLL_SLOW);
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
          setSseConnected(false);
          setPollInterval(POLL_FAST);
          if (es.readyState === EventSource.CLOSED) {
            try { es.close(); } catch { /* ignore */ }
            const ms = reconnectMsRef.current;
            reconnectMsRef.current = Math.min(ms * 2, SSE_RECONNECT_MAX);
            reconnectTimerRef.current = setTimeout(openStream, ms);
          }
        };
      } catch {
        setSseConnected(false);
        setPollInterval(POLL_FAST);
      }
    };

    closedRef.current = false;
    fetchRest();
    setPollInterval(POLL_FAST);
    openStream();

    return () => {
      closedRef.current = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try { esRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  if (!state) return null;
  return { ...state, _sseConnected: sseConnected };
}
