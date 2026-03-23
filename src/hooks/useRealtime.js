import { useEffect, useRef, useState } from 'react';

/**
 * Simulates live data updates with periodic random fluctuations.
 * Returns a value that periodically changes to simulate real-time feel.
 */
export function useRealtime(baseValue, { interval = 8000, variance = 0.05 } = {}) {
  const [value, setValue] = useState(baseValue);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const delta = baseValue * variance * (Math.random() * 2 - 1);
      setValue(Math.round(baseValue + delta));
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [baseValue, interval, variance]);

  return value;
}
