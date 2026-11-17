import {internalMutation} from '../_generated/server';
import {v} from 'convex/values';

export const insertArticleBatch = internalMutation({
  args: {
    articles: v.array(
      v.object({
        key: v.string(),
        categoryName: v.string(),
        thumbnailUrl: v.string(),
        publishedAt: v.string(),
      }),
    ),
  },
  handler: async (ctx, {articles}) => {
    for (const article of articles) {
      const existing = await ctx.db
        .query('articles')
        .withIndex('by_key', (q) => q.eq('key', article.key))
        .first();
      if (!existing) {
        await ctx.db.insert('articles', article);
      }
    }
  },
});

export const updateThumbnailStorageId = internalMutation({
  args: {
    key: v.string(),
    storageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, {key, storageId}) => {
    const article = await ctx.db
      .query('articles')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    if (article) {
      await ctx.db.patch(article._id, {thumbnailStorageId: storageId});
    }
  },
});

export const updateThumbnailUrl = internalMutation({
  args: {
    key: v.string(),
    thumbnailUrl: v.string(),
  },
  handler: async (ctx, {key, thumbnailUrl}) => {
    const article = await ctx.db
      .query('articles')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    if (article) {
      await ctx.db.patch(article._id, {thumbnailUrl});
    }
  },
});
