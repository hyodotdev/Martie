import {query} from '../_generated/server';
import {v} from 'convex/values';
import {paginationOptsValidator} from 'convex/server';

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, {limit}) => {
    const articles = await ctx.db
      .query('articles')
      .withIndex('by_publishedAt')
      .order('desc')
      .take(limit || 50);

    const results = await Promise.all(
      articles.map(async (article) => {
        let storageThumbnailUrl: string | null = null;
        if (article.thumbnailStorageId) {
          storageThumbnailUrl = await ctx.storage.getUrl(
            article.thumbnailStorageId,
          );
        }
        return {...article, storageThumbnailUrl};
      }),
    );

    return results;
  },
});

export const listPaginated = query({
  args: {
    categoryName: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, {categoryName, paginationOpts}) => {
    const baseQuery = categoryName
      ? ctx.db
          .query('articles')
          .withIndex('by_category_and_publishedAt', (q) =>
            q.eq('categoryName', categoryName),
          )
      : ctx.db.query('articles').withIndex('by_publishedAt');

    const paginated = await baseQuery.order('desc').paginate(paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (article) => {
        let storageThumbnailUrl: string | null = null;
        if (article.thumbnailStorageId) {
          storageThumbnailUrl = await ctx.storage.getUrl(
            article.thumbnailStorageId,
          );
        }
        return {...article, storageThumbnailUrl};
      }),
    );

    return {
      ...paginated,
      page,
    };
  },
});

export const getByKey = query({
  args: {key: v.string()},
  handler: async (ctx, {key}) => {
    const article = await ctx.db
      .query('articles')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    if (!article) return null;

    let storageThumbnailUrl: string | null = null;
    if (article.thumbnailStorageId) {
      storageThumbnailUrl = await ctx.storage.getUrl(
        article.thumbnailStorageId,
      );
    }

    return {...article, storageThumbnailUrl};
  },
});

/**
 * 카테고리명으로 블로그 1개 조회 (데일리 결과에서 연결용)
 */
export const getByCategory = query({
  args: {categoryName: v.string()},
  handler: async (ctx, {categoryName}) => {
    const article = await ctx.db
      .query('articles')
      .withIndex('by_category', (q) => q.eq('categoryName', categoryName))
      .first();

    if (!article) return null;

    let storageThumbnailUrl: string | null = null;
    if (article.thumbnailStorageId) {
      storageThumbnailUrl = await ctx.storage.getUrl(
        article.thumbnailStorageId,
      );
    }

    return {...article, storageThumbnailUrl};
  },
});

export const getAllArticleKeys = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query('articles').collect();
    return articles.map((a) => ({_id: a._id, key: a.key}));
  },
});
