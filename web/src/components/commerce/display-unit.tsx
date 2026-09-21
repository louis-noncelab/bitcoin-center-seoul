"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DisplayUnit } from "./format";

const DisplayUnitContext = createContext<DisplayUnit>("SATS");

export function DisplayUnitProvider({ unit, children }: { readonly unit: DisplayUnit; readonly children: ReactNode }) {
  return <DisplayUnitContext.Provider value={unit}>{children}</DisplayUnitContext.Provider>;
}

export function useDisplayUnit(): DisplayUnit {
  return useContext(DisplayUnitContext);
}
