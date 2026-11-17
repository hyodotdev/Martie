import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const appVersionsTable = defineTable({
  version: v.string(),
  shouldUpdate: v.boolean(),
  createdAt: v.number(),
}).index('by_shouldUpdate', ['shouldUpdate']);
