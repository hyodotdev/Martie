import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const categoriesTable = defineTable({
  name: v.string(),
  description: v.string(),
}).index('by_name', ['name']);
