import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const articlesTable = defineTable({
  key: v.string(), // unique key like "20260411_article_0001"
  categoryName: v.string(), // matches quiz categories
  thumbnailUrl: v.string(), // Unsplash image URL
  thumbnailStorageId: v.optional(v.id('_storage')), // Convex storage fallback
  publishedAt: v.string(), // ISO date string
})
  .index('by_key', ['key'])
  .index('by_publishedAt', ['publishedAt'])
  .index('by_category', ['categoryName'])
  .index('by_category_and_publishedAt', ['categoryName', 'publishedAt']);
