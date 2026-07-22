'use client';
import { useState, useEffect, useRef } from 'react';

export default function usePersistentFilter(key, initialValue) {
  // 1. Synchronously initialize state from localStorage to prevent API race conditions
  const [value, setValue] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(`stip_filter_${key}`);
        return item !== null ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.error("Error reading localStorage", error);
        return initialValue;
      }
    }
    return initialValue;
  });

  const isFirstRender = useRef(true);

  // 2. Only save to localStorage AFTER the first render to avoid accidental overwrites on mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`stip_filter_${key}`, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue];
}