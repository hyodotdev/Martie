import type {MutationCtx} from '../../convex/_generated/server';
import type {
  ProductEvent,
  ProductEventBatch,
} from '../../convex/analytics/types';
import {recordEvents} from '../../convex/analytics/mutations';

jest.mock('../../convex/_generated/server', () => ({
  mutation: (definition: unknown) => definition,
}));

type Row = Record<string, unknown> & {_id: string; _creationTime: number};
type Table = 'analyticsVisitors' | 'analyticsVisitorDays';
type IndexBuilder = {eq: (field: string, value: unknown) => IndexBuilder};
const record = (
  recordEvents as unknown as {
    handler: (ctx: MutationCtx, batch: ProductEventBatch) => Promise<void>;
  }
).handler;

function testDatabase() {
  const rows: Record<Table, Row[]> = {
    analyticsVisitors: [],
    analyticsVisitorDays: [],
  };
  const db = {
    query: (table: Table) => ({
      withIndex: (
        _name: string,
        select: (builder: IndexBuilder) => IndexBuilder,
      ) => {
        const filters: [string, unknown][] = [];
        const builder: IndexBuilder = {
          eq: (field, value) => {
            filters.push([field, value]);
            return builder;
          },
        };
        select(builder);
        return {
          unique: async () => {
            const matches = rows[table].filter((row) =>
              filters.every(([field, value]) => row[field] === value),
            );
            if (matches.length > 1) throw new Error('Duplicate index entry');
            return matches[0] ?? null;
          },
        };
      },
    }),
    insert: async (table: Table, value: Record<string, unknown>) => {
      const id = `${table}_${rows[table].length}`;
      rows[table].push({...value, _id: id, _creationTime: Date.now()});
      return id;
    },
    patch: async (id: string, value: Record<string, unknown>) => {
      const row = Object.values(rows)
        .flat()
        .find((item) => item._id === id);
      if (!row) throw new Error('Missing row');
      Object.assign(row, value);
    },
  };
  return {rows, ctx: {db} as unknown as MutationCtx};
}

const firstSeenAt = Date.parse('2026-10-13T10:00:00+09:00');
const event = (
  name: ProductEvent['name'],
  occurredAt = firstSeenAt,
): ProductEvent => ({
  name,
  occurredAt,
  utcOffsetMinutes: 540,
  source: 'shorts_ko',
  platform: 'ios',
  language: 'ko',
});
const batch = (events: ProductEvent[]): ProductEventBatch => ({
  visitorId: 'visitor_stable_guest_identifier',
  firstSeenAt,
  firstSeenUtcOffsetMinutes: 540,
  isNewInstall: true,
  events,
});

describe('anonymous product event ingestion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-16T10:00:00+09:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('accepts guests without authentication and deduplicates replayed events', async () => {
    const {ctx, rows} = testDatabase();
    const events = batch([
      event('visit'),
      event('daily_quiz_started'),
      event('daily_quiz_completed'),
    ]);
    await record(ctx, events);
    await record(ctx, events);
    expect(rows.analyticsVisitors).toHaveLength(1);
    expect(rows.analyticsVisitorDays).toHaveLength(1);
    expect(rows.analyticsVisitors[0]).toMatchObject({
      source: 'shorts_ko',
      firstQuizCompletedDay: '2026-10-13',
    });
    expect(rows.analyticsVisitorDays[0]).toMatchObject({
      dailyQuizStarted: true,
      dailyQuizCompleted: true,
    });
  });

  it('keeps one visitor across signup and records next-day return separately', async () => {
    const {ctx, rows} = testDatabase();
    await record(ctx, batch([event('daily_quiz_completed')]));
    await record(ctx, {
      ...batch([event('visit', firstSeenAt + 86_400_000)]),
      isNewInstall: false,
    });
    expect(rows.analyticsVisitors).toHaveLength(1);
    expect(rows.analyticsVisitors[0].isNewInstall).toBe(true);
    expect(rows.analyticsVisitorDays).toHaveLength(2);
    expect(rows.analyticsVisitorDays[1]).toMatchObject({
      day: '2026-10-14',
      dailyQuizCompleted: false,
    });
  });

  it('uses the earliest completion when delayed offline batches arrive out of order', async () => {
    const {ctx, rows} = testDatabase();
    await record(
      ctx,
      batch([event('daily_quiz_completed', firstSeenAt + 86_400_000)]),
    );
    await record(ctx, batch([event('practice_quiz_completed')]));
    expect(rows.analyticsVisitors[0]).toMatchObject({
      firstQuizCompletedAt: firstSeenAt,
      firstQuizCompletedDay: '2026-10-13',
    });
  });

  it('fills delayed link attribution without overwriting the first known channel', async () => {
    const {ctx, rows} = testDatabase();
    await record(ctx, batch([{...event('visit'), source: 'unattributed'}]));
    await record(ctx, batch([event('visit')]));
    await record(ctx, batch([{...event('visit'), source: 'referral'}]));
    expect(rows.analyticsVisitors[0].source).toBe('shorts_ko');
  });
});
