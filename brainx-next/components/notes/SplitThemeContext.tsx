"use client";

import { createContext, useContext } from "react";
import { ThemeTokens, AUTO_THEME } from "./theme";

export const SplitThemeContext = createContext<ThemeTokens>(AUTO_THEME);

export function useSplitTheme(): ThemeTokens {
  return useContext(SplitThemeContext);
}
