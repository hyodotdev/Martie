import {internalMutation} from './_generated/server';
import {v} from 'convex/values';

export const deleteQuizzesByCategory = internalMutation({
  args: {
    category: v.string(), // 삭제할 카테고리 이름을 인수로 받음
  },
  handler: async (ctx, {category}) => {
    let deletedQuizzes = 0;
    let deletedLanguages = 0;

    // 1. categories에서 지정된 category 이름으로 찾기
    const categoryDoc = await ctx.db
      .query('categories')
      .withIndex('by_name', (q) => q.eq('name', category))
      .first();

    if (!categoryDoc) {
      return {
        success: false,
        deletedQuizzes: 0,
        deletedLanguages: 0,
        message: `${category} 카테고리를 찾을 수 없습니다.`,
      };
    }

    const categoryId = categoryDoc._id;

    // 2. quizzes에서 categoryId에 해당하는 퀴즈 찾기
    const quizzes = await ctx.db
      .query('quizzes')
      .withIndex('by_category', (q) => q.eq('categoryId', categoryId))
      .collect();

    // 3. quizLanguages와 quizzes 삭제
    for (const quiz of quizzes) {
      const key = quiz.key;
      const quizLanguages = await ctx.db
        .query('quizLanguages')
        .withIndex('by_key', (q) => q.eq('key', key))
        .collect();

      // quizLanguages 삭제
      for (const quizLang of quizLanguages) {
        await ctx.db.delete(quizLang._id);
        deletedLanguages++;
      }

      // quiz 삭제
      await ctx.db.delete(quiz._id);
      deletedQuizzes++;
    }

    // 4. categories 삭제
    await ctx.db.delete(categoryId);

    const message = `삭제 완료: ${deletedQuizzes}개 퀴즈, ${deletedLanguages}개 언어 데이터`;
    console.log(message);

    return {
      success: true,
      deletedQuizzes,
      deletedLanguages,
      message,
    };
  },
});
