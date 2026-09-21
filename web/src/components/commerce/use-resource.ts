"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api-client";
import { createdSchema } from "./contracts";

export function useResource<T>(path: string, schema: z.ZodType<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const token = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.has("token")) {
      token.current = fragment.get("token");
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
    async function load() {
      try {
        if (token.current) {
          if (!/^[A-Za-z0-9_-]{43}$/.test(token.current)) throw new ApiError("INVALID_ACCESS", "조회 링크가 올바르지 않습니다. / This access link is invalid.", 401);
          await apiRequest(`${path}/access`, createdSchema, { ...jsonRequest({ token: token.current }), signal: controller.signal });
          token.current = null;
        }
        const value = await apiRequest(path, schema, { signal: controller.signal });
        if (!controller.signal.aborted) { setData(value); setError(null); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure); }
    }
    void load();
    const visible = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", visible); };
  }, [path, schema, revision]);
  return { data, error, refresh: () => setRevision((value) => value + 1) };
}
