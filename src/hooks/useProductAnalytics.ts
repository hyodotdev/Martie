import {useEffect} from 'react';
import {AppState} from 'react-native';
import {useConvex} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {
  connectProductAnalytics,
  flushProductAnalytics,
  trackProductEvent,
} from '../utils/productAnalytics';

export function useProductAnalytics() {
  const convex = useConvex();
  useEffect(() => {
    if (__DEV__) return;
    const disconnect = connectProductAnalytics((batch) =>
      convex.mutation(api.analytics.mutations.recordEvents, batch),
    );
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') trackProductEvent('visit');
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void flushProductAnalytics();
      }
    }, 30_000);
    return () => {
      disconnect();
      subscription.remove();
      clearInterval(interval);
    };
  }, [convex]);
}
