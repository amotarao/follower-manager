'use client';

import { ThemeContainer } from '../lib/theme';

export const ThemeProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <ThemeContainer.Provider>{children}</ThemeContainer.Provider>;
};
