"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DisplayUnit } from "./format";

const DisplayUnitContext = createContext<{ readonly unit: DisplayUnit; readonly rate: string | null }>({ unit: "SATS", rate: null });

export function DisplayUnitProvider({ unit, rate = null, children }: { readonly unit: DisplayUnit; readonly rate?: string | null; readonly children: ReactNode }) {
  return <DisplayUnitContext.Provider value={{ unit, rate }}>{children}</DisplayUnitContext.Provider>;
}

export function useDisplayUnit(): DisplayUnit {
  return useContext(DisplayUnitContext).unit;
}

export function useDisplayRate(): string | null {
  return useContext(DisplayUnitContext).rate;
}
