import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const providersTable = defineTable({
  name: v.string(),
  url: v.optional(v.string()),
  description: v.optional(v.string()),
}).index('by_name', ['name']);
