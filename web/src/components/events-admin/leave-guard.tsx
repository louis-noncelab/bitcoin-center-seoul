"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type LeaveCheck = () => Promise<boolean>;

type LeaveGuardApi = {
  readonly register: (guard: LeaveCheck) => () => void;
  readonly confirm: () => Promise<boolean>;
};

const LeaveGuardContext = createContext<LeaveGuardApi | null>(null);

export function LeaveGuard({ children }: { readonly children: ReactNode }) {
  const guards = useRef(new Set<LeaveCheck>());
  const register = useCallback((guard: LeaveCheck) => {
    guards.current.add(guard);
    return () => { guards.current.delete(guard); };
  }, []);
  const confirm = useCallback(async () => {
    for (const guard of guards.current) {
      if (!(await guard())) return false;
    }
    return true;
  }, []);
  const api = useMemo(() => ({ register, confirm }), [register, confirm]);
  return <LeaveGuardContext.Provider value={api}>{children}</LeaveGuardContext.Provider>;
}

export function useRegisterLeave(guard: LeaveCheck) {
  const api = useContext(LeaveGuardContext);
  const guardRef = useRef(guard);
  useEffect(() => { guardRef.current = guard; }, [guard]);
  useEffect(() => {
    if (!api) return;
    return api.register(() => guardRef.current());
  }, [api]);
}

export function useLeaveConfirmation(): LeaveCheck {
  const api = useContext(LeaveGuardContext);
  return useCallback(async () => (api ? api.confirm() : true), [api]);
}
