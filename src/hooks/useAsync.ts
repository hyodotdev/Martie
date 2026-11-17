import {useCallback, useEffect, useRef, useState} from 'react';

export function useAsync<T>(asyncFunction: () => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const isExecutingRef = useRef(false);
  const asyncFunctionRef = useRef(asyncFunction);

  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  const execute = useCallback(async () => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    setLoading(true);
    try {
      return await asyncFunctionRef.current();
    } finally {
      isExecutingRef.current = false;
      setLoading(false);
    }
  }, []);

  return {execute, loading};
}
