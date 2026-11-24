/**
 * Minimal in-memory stand-in for the Convex `ctx` the battle functions use:
 * indexed queries are evaluated as plain field filters.
 */
type Row = {_id: string; _creationTime: number; [field: string]: unknown};
type Condition = {field: string; op: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'; value: unknown};

type RangeBuilder = {
  eq: (field: string, value: unknown) => RangeBuilder;
  gt: (field: string, value: unknown) => RangeBuilder;
  gte: (field: string, value: unknown) => RangeBuilder;
  lt: (field: string, value: unknown) => RangeBuilder;
  lte: (field: string, value: unknown) => RangeBuilder;
};

const compare = (a: unknown, b: unknown): number =>
  (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;

function matches(row: Row, conditions: Condition[]): boolean {
  return conditions.every(({field, op, value}) => {
    const c = compare(row[field], value);
    if (op === 'eq') return row[field] === value;
    if (op === 'gt') return c > 0;
    if (op === 'gte') return c >= 0;
    if (op === 'lt') return c < 0;
    return c <= 0;
  });
}

export type ScheduledCall = {runAt: number; args: Record<string, unknown>};

export function createFakeCtx() {
  const tables = new Map<string, Row[]>();
  const scheduled: ScheduledCall[] = [];
  let nextId = 1;

  const table = (name: string): Row[] => {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  };
  const find = (id: string): Row | undefined => {
    for (const rows of tables.values()) {
      const row = rows.find((r) => r._id === id);
      if (row) return row;
    }
    return undefined;
  };

  const query = (name: string) => {
    const conditions: Condition[] = [];
    let descending = false;
    const results = () => {
      const rows = table(name).filter((row) => matches(row, conditions));
      return descending ? [...rows].reverse() : rows;
    };
    const chain = {
      withIndex: (_index: string, build?: (q: RangeBuilder) => unknown) => {
        const builder: RangeBuilder = {
          eq: (field, value) => (conditions.push({field, op: 'eq', value}), builder),
          gt: (field, value) => (conditions.push({field, op: 'gt', value}), builder),
          gte: (field, value) => (conditions.push({field, op: 'gte', value}), builder),
          lt: (field, value) => (conditions.push({field, op: 'lt', value}), builder),
          lte: (field, value) => (conditions.push({field, op: 'lte', value}), builder),
        };
        build?.(builder);
        return chain;
      },
      order: (order: 'asc' | 'desc') => {
        descending = order === 'desc';
        return chain;
      },
      first: async () => results()[0] ?? null,
      collect: async () => results(),
      take: async (n: number) => results().slice(0, n),
      paginate: async ({numItems}: {numItems: number}) => ({
        page: results().slice(0, numItems),
        isDone: results().length <= numItems,
        continueCursor: '',
      }),
    };
    return chain;
  };

  const db = {
    query,
    get: async (id: string) => find(id) ?? null,
    insert: async (name: string, doc: Record<string, unknown>) => {
      const _id = `${name}:${nextId++}`;
      table(name).push({...doc, _id, _creationTime: nextId});
      return _id;
    },
    patch: async (id: string, fields: Record<string, unknown>) => {
      const row = find(id);
      if (!row) throw new Error(`No document ${id}`);
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) delete row[key];
        else row[key] = value;
      }
    },
  };

  const ctx = {
    db,
    scheduler: {
      runAt: jest.fn(async (runAt: number, _ref: unknown, args: Record<string, unknown>) => {
        scheduled.push({runAt, args});
      }),
    },
    storage: {getUrl: jest.fn(async () => null)},
  };

  return {ctx, table, scheduled, find};
}

export type FakeCtx = ReturnType<typeof createFakeCtx>['ctx'];

/** The handler behind a registered Convex function. */
export function handlerOf<Args, Result>(
  fn: unknown,
): (ctx: FakeCtx, args: Args) => Promise<Result> {
  return (fn as {_handler: (ctx: FakeCtx, args: Args) => Promise<Result>})
    ._handler;
}
