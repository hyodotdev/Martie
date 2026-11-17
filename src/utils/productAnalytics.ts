import {Platform} from 'react-native';
import {getLocale} from '../STRINGS';
import type {
  ProductEvent,
  ProductEventBatch,
  ProductEventName,
} from '../../convex/analytics/types';
import {analyticsDay} from '../../convex/analytics/helpers';
import {getAcquisitionSource} from './acquisition';
import {storage, Storage} from './storage';

type Visitor = Omit<ProductEventBatch, 'events'>;
type Sender = (batch: ProductEventBatch) => Promise<unknown>;

let sender: Sender | undefined;
let flushing = false;
const measurementRolloutAt = Date.parse('2026-10-13T00:00:00+09:00');

function getVisitor(): Visitor {
  const raw = storage.getString(Storage.ProductAnalyticsVisitor);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as unknown;
      if (typeof saved === 'object' && saved !== null) {
        const visitor = saved as Record<string, unknown>;
        if (
          typeof visitor.visitorId === 'string' &&
          typeof visitor.firstSeenAt === 'number' &&
          typeof visitor.firstSeenUtcOffsetMinutes === 'number' &&
          typeof visitor.isNewInstall === 'boolean'
        ) {
          return {
            visitorId: visitor.visitorId,
            firstSeenAt: visitor.firstSeenAt,
            firstSeenUtcOffsetMinutes: visitor.firstSeenUtcOffsetMinutes,
            isNewInstall: visitor.isNewInstall,
          };
        }
      }
    } catch {
      // Recover a damaged local identity without blocking startup.
    }
  }
  const now = new Date();
  const firstLaunchAt = storage.getNumber(Storage.FirstLaunchAt);
  const visitor: Visitor = {
    visitorId: `visitor_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`,
    firstSeenAt: now.getTime(),
    firstSeenUtcOffsetMinutes: -now.getTimezoneOffset(),
    // Embedded binaries can record first launch before downloading this OTA.
    isNewInstall:
      firstLaunchAt === undefined || firstLaunchAt >= measurementRolloutAt,
  };
  storage.set(Storage.ProductAnalyticsVisitor, JSON.stringify(visitor));
  return visitor;
}

function readQueue(): ProductEvent[] {
  const raw = storage.getString(Storage.ProductAnalyticsQueue);
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw) as unknown;
    if (!Array.isArray(saved)) return [];
    return saved.filter((value): value is ProductEvent => {
      if (typeof value !== 'object' || value === null) return false;
      const event = value as Record<string, unknown>;
      return (
        [
          'visit',
          'daily_quiz_started',
          'daily_quiz_completed',
          'practice_quiz_completed',
        ].includes(String(event.name)) &&
        typeof event.occurredAt === 'number' &&
        Number.isFinite(event.occurredAt) &&
        typeof event.utcOffsetMinutes === 'number' &&
        Number.isInteger(event.utcOffsetMinutes) &&
        typeof event.source === 'string' &&
        typeof event.platform === 'string' &&
        (event.language === undefined || typeof event.language === 'string')
      );
    });
  } catch {
    return [];
  }
}

export function trackProductEvent(
  name: ProductEventName,
  properties: Record<string, unknown> = {},
) {
  if (__DEV__) return;
  try {
    getVisitor();
    const now = new Date();
    const event: ProductEvent = {
      name,
      occurredAt: now.getTime(),
      utcOffsetMinutes: -now.getTimezoneOffset(),
      source: getAcquisitionSource() ?? 'unattributed',
      platform: Platform.OS,
      language:
        typeof properties.language === 'string'
          ? properties.language
          : getLocale(),
    };
    const queue = readQueue();
    const day = analyticsDay(event.occurredAt, event.utcOffsetMinutes);
    if (
      !queue.some(
        (item) =>
          item.name === event.name &&
          item.source === event.source &&
          analyticsDay(item.occurredAt, item.utcOffsetMinutes) === day,
      )
    ) {
      storage.set(
        Storage.ProductAnalyticsQueue,
        JSON.stringify([...queue, event]),
      );
    }
    void flushProductAnalytics();
  } catch {
    // Measurement must never interrupt a quiz or app launch.
  }
}

export function connectProductAnalytics(nextSender: Sender) {
  if (!__DEV__) getVisitor();
  sender = nextSender;
  void flushProductAnalytics();
  return () => {
    if (sender === nextSender) sender = undefined;
  };
}

export async function flushProductAnalytics() {
  if (__DEV__ || !sender || flushing) return;
  flushing = true;
  try {
    while (sender) {
      const events = readQueue().slice(0, 20);
      if (events.length === 0) break;
      await sender({...getVisitor(), events});
      const sent = new Set(events.map((event) => JSON.stringify(event)));
      storage.set(
        Storage.ProductAnalyticsQueue,
        JSON.stringify(
          readQueue().filter((event) => !sent.has(JSON.stringify(event))),
        ),
      );
    }
  } catch {
    // Keep the original timestamps and retry on foreground, timer, or launch.
  } finally {
    flushing = false;
  }
}

export function trackProductAnalyticsEvent(
  name: string,
  properties: Record<string, unknown>,
) {
  switch (name) {
    case 'app_launch':
    case 'app_session_started':
    case 'acquisition_source_captured':
      trackProductEvent('visit', properties);
      break;
    case 'daily_quiz_started':
    case 'daily_quiz_completed':
    case 'practice_quiz_completed':
      trackProductEvent(name, properties);
      break;
  }
}
