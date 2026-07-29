"use client";

import { useEffect, useState } from "react";

// Delays updating the returned value until `value` has stopped changing for
// `delayMs` — used by search inputs so typing doesn't fire an API call per keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
