import {internalQuery, query} from '../_generated/server';
import {v} from 'convex/values';

/**
 * 모든 카테고리 목록 조회
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('categories').collect();
  },
});

export const getById = internalQuery({
  args: {
    categoryId: v.id('categories'),
  },
  handler: async (ctx, {categoryId}) => {
    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error('Category not found');
    return category;
  },
});

/**
 * 이름으로 카테고리 조회
 */
export const getByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, {name}) => {
    return await ctx.db
      .query('categories')
      .filter((q) => q.eq(q.field('name'), name))
      .first();
  },
});
