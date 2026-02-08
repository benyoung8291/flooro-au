import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that manages a local copy of a field value with debounced saves.
 * Typing updates local state instantly; the server save fires after `delay` ms of inactivity.
 * External changes (e.g. from another tab) are synced in when the user is NOT actively editing.
 */
export function useDebouncedField(
  serverValue: string | null,
  onSave: (value: string | null) => void,
  delay = 600
) {
  const [localValue, setLocalValue] = useState(serverValue ?? '');
  const isTouched = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync from server ONLY when we haven't touched the field or after save settles
  useEffect(() => {
    if (!isTouched.current) {
      setLocalValue(serverValue ?? '');
    }
  }, [serverValue]);

  const onChange = useCallback(
    (next: string) => {
      isTouched.current = true;
      setLocalValue(next);

      // Clear any pending save
      if (timerRef.current) clearTimeout(timerRef.current);

      // Schedule a debounced save
      timerRef.current = setTimeout(() => {
        onSave(next.trim().length > 0 ? next : null);
        // After save, allow external sync again
        isTouched.current = false;
      }, delay);
    },
    [onSave, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Flush pending save immediately (e.g. on blur)
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    if (isTouched.current) {
      onSave(localValue.trim().length > 0 ? localValue : null);
      isTouched.current = false;
    }
  }, [localValue, onSave]);

  return { value: localValue, onChange, flush };
}
