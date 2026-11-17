import {query} from './_generated/server';
import {v} from 'convex/values';

export const getQuizIndexesBatch = query({
  args: {
    cursor: v.optional(v.string()), // 페이지네이션 커서
    limit: v.optional(v.number()), // 한 번에 가져올 항목 수
  },
  handler: async (ctx, {cursor, limit = 100}) => {
    const quizzesResult = await ctx.db
      .query('quizzes')
      .withIndex('by_key') // key로 정렬된 순서로 가져옴
      .order('asc')
      .paginate({cursor: cursor || null, numItems: limit});

    const indexes = quizzesResult.page.map((quiz) => quiz.indexes);

    return {
      results: indexes, // 각 퀴즈의 indexes 배열
      nextCursor: quizzesResult.continueCursor,
      isDone: quizzesResult.isDone,
    };
  },
});
