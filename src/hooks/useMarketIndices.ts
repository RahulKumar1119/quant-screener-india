import { useState, useEffect } from "react";
import type { MarketIndex } from "../types/index";
import { fetchMarketIndices } from "../api/client";

export interface TapeIndex {
  name: string;
  value: number;
  change_pct: number;
}

interface UseMarketIndicesReturn {
  indices: TapeIndex[];
  asOf: string | null;
  live: boolean;
}

/** Bundled fallback so the tape never renders empty (replaced by live data). */
const FALLBACK_INDICES: TapeIndex[] = [
  { name: "NIFTY 50", value: 22147.0, change_pct: 0.82 },
  { name: "SENSEX", value: 72831.94, change_pct: 0.76 },
  { name: "NIFTY BANK", value: 47562.3, change_pct: -0.21 },
  { name: "NIFTY IT", value: 38920.15, change_pct: 1.34 },
  { name: "NIFTY PHARMA", value: 19845.6, change_pct: 0.45 },
  { name: "NIFTY AUTO", value: 24380.5, change_pct: 0.92 },
];

const STORAGE_KEY = "qs-market-indices";

function readStored(): { indices: TapeIndex[]; asOf: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      indices?: MarketIndex[];
      as_of?: string;
    };
    if (!Array.isArray(parsed.indices) || typeof parsed.as_of !== "string") {
      return null;
    }
    return { indices: parsed.indices, asOf: parsed.as_of };
  } catch {
    return null;
  }
}

/**
 * Live headline indices for the landing tape.
 * Backend caches for 15 min, so values stay accurate through the session
 * and refresh every day. Falls back to stored/bundled data offline.
 */
export function useMarketIndices(): UseMarketIndicesReturn {
  const [indices, setIndices] = useState<TapeIndex[]>(() => {
    return readStored()?.indices ?? FALLBACK_INDICES;
  });
  const [asOf, setAsOf] = useState<string | null>(() => {
    return readStored()?.asOf ?? null;
  });
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetchMarketIndices();
        if (cancelled || response.indices.length === 0) return;
        setIndices(response.indices);
        setAsOf(response.as_of);
        setLive(true);
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ indices: response.indices, as_of: response.as_of })
          );
        } catch {
          // Storage full or unavailable — live data still renders.
        }
      } catch {
        if (!cancelled) setLive(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { indices, asOf, live };
}
