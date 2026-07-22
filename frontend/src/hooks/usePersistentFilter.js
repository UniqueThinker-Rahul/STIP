'use client';
import { useState, useEffect } from 'react';

export default function usePersistentFilter(key, initialValue) {
  // Safely grab the data from browser memory
  const getSavedValue = () => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(`stip_filter_${key}`);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  };

  const [value, setValue] = useState(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydration: Sync with localStorage ONLY once when the component officially mounts
  useEffect(() => {
    setValue(getSavedValue());
    setIsHydrated(true);
  }, [key]);

  // 2. Persistence: Save to localStorage whenever value changes, BUT ONLY after data has hydrated
  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(`stip_filter_${key}`, JSON.stringify(value));
    }
  }, [key, value, isHydrated]);

  return [value, setValue];
}