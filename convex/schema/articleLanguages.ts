import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const articleLanguagesTable = defineTable({
  key: v.string(), // article key suffix: "_title", "_summary", "_content"
  language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
  value: v.string(),
  type: v.string(), // "title", "summary", "content"
})
  .index('by_key_and_language', ['key', 'language'])
  .index('by_key', ['key'])
  .index('by_language', ['language']);
