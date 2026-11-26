import {v} from 'convex/values';
import {mutation} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';

export const updateUserCategories = mutation({
  args: v.object({
    categoryIds: v.array(v.id('categories')),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // 1. 현재 유저의 모든 카테고리 조회
    const existingCategories = await ctx.db
      .query('userCategories')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    // 2. 삭제해야 할 카테고리 처리
    const existingCategoryIds = new Set(
      existingCategories.map((cat) => cat.categoryId.toString()),
    );
    const newCategoryIds = new Set(args.categoryIds.map((id) => id.toString()));

    // 삭제: 기존에는 있었지만 새로운 목록에는 없는 카테고리
    for (const category of existingCategories) {
      if (!newCategoryIds.has(category.categoryId.toString())) {
        await ctx.db.delete(category._id);
      }
    }

    // 3. 새로운 카테고리 추가
    await Promise.all(
      args.categoryIds.map(async (categoryId) => {
        // 이미 존재하는 카테고리는 건너뛰기
        if (existingCategoryIds.has(categoryId.toString())) {
          return;
        }

        // 새로운 카테고리만 추가
        await ctx.db.insert('userCategories', {
          userId,
          categoryId,
          totalAttempts: 0,
          correctAnswers: 0,
          highestLevel: 0,
          lastAttemptAt: new Date().toISOString(),
        });
      }),
    );

    return true;
  },
});
