import {internalMutation} from '../_generated/server';
import {v} from 'convex/values';
import {Doc} from '../_generated/dataModel';

export const upsertQuiz = internalMutation({
  args: {
    quizData: v.object({
      level: v.number(),
      key: v.string(),
      answerKey: v.string(),
      indexes: v.array(v.string()),
      options: v.array(
        v.object({
          key: v.string(),
          isAnswer: v.optional(v.boolean()), // 스키마와 일치하도록 optional로 유지
        }),
      ),
      categoryId: v.id('categories'),
      youtubeUrl: v.optional(v.string()),
      providerId: v.optional(v.id('providers')),
    }),
  },
  handler: async (ctx, {quizData}): Promise<Doc<'quizzes'>> => {
    const existingQuiz = await ctx.db
      .query('quizzes')
      .withIndex('by_key', (q) => q.eq('key', quizData.key))
      .first();

    if (existingQuiz) {
      // 기존 퀴즈 업데이트
      await ctx.db.patch(existingQuiz._id, quizData);
      return (await ctx.db.get(existingQuiz._id)) as Doc<'quizzes'>;
    } else {
      // 새 퀴즈 삽입
      const id = await ctx.db.insert('quizzes', quizData);
      return (await ctx.db.get(id)) as Doc<'quizzes'>;
    }
  },
});

export const upsertQuizBatch = internalMutation({
  args: {
    quizzes: v.array(
      v.object({
        level: v.number(),
        key: v.string(),
        answerKey: v.string(),
        indexes: v.array(v.string()),
        options: v.array(
          v.object({
            key: v.string(),
            isAnswer: v.boolean(),
          }),
        ),
        categoryId: v.id('categories'),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const insertions = args.quizzes.map((quiz) =>
      ctx.db.insert('quizzes', quiz),
    );
    await Promise.all(insertions);
    return true;
  },
});
