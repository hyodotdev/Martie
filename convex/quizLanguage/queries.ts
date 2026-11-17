import {query} from '../_generated/server';
import {v} from 'convex/values';
import {paginationOptsValidator} from '../utils/validators';
import {Id} from '../_generated/dataModel';

// 모든 퀴즈 언어 항목의 키를 가져오는 쿼리
export const getAllKeys = query({
  args: {},
  handler: async (ctx) => {
    // 모든 퀴즈 언어 데이터 가져오기
    const allLanguageEntries = await ctx.db.query('quizLanguages').collect();

    // 필요한 정보만 추출하여 반환 (ID 포함)
    return allLanguageEntries.map((entry) => ({
      _id: entry._id, // 이것은 이미 Id<"quizLanguages"> 타입을 가짐
      key: entry.key,
      language: entry.language,
      type: entry.type,
    }));
  },
});

// 특정 언어와 유형에 대한 모든 텍스트 가져오기
export const getByLanguage = query({
  args: {
    language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
  },
  handler: async (ctx, args) => {
    // by_language 인덱스 사용
    return await ctx.db
      .query('quizLanguages')
      .withIndex('by_language', (q) => q.eq('language', args.language))
      .collect();
  },
});

// 특정 퀴즈 키에 대한 모든 언어 텍스트 가져오기
export const getLangByKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('quizLanguages')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .collect();
  },
});

// 특정 퀴즈 키와 언어에 대한 텍스트 가져오기
export const getLangByKeyAndLanguage = query({
  args: {
    key: v.string(),
    language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('quizLanguages')
      .withIndex('by_key_and_language', (q) =>
        q.eq('key', args.key).eq('language', args.language),
      )
      .collect();
  },
});

/**
 * 퀴즈 언어 데이터의 키만 페이지네이션으로 가져오는 쿼리
 */
export const getPaginatedKeys = query({
  args: {
    cursor: paginationOptsValidator.cursor,
    limit: paginationOptsValidator.limit,
  },
  handler: async (ctx, args) => {
    // Define the document type from the database schema
    type QuizLanguageDocument = {
      _id: Id<'quizLanguages'>;
      _creationTime: number;
      key: string;
      language: string;
      type: string;
      value: string;
    };

    try {
      console.log(
        `getPaginatedKeys 쿼리 실행: cursor=${args.cursor || 'null'}, limit=${args.limit || 100}`,
      );

      // Determine the number of items to fetch (최댓값 제한)
      const numItems = Math.min(args.limit || 100, 1000);

      // cursor와 limit을 사용하여 페이지네이션 처리
      const paginationResult = await ctx.db
        .query('quizLanguages')
        .order('asc')
        .paginate({
          cursor: args.cursor || null,
          numItems,
        });

      console.log(
        `페이지네이션 결과: ${paginationResult.page.length}개 항목, 다음 페이지 존재=${!!paginationResult.continueCursor}`,
      );

      return {
        items: paginationResult.page.map((entry: QuizLanguageDocument) => ({
          _id: entry._id,
          key: entry.key,
          language: entry.language,
          type: entry.type,
        })),
        cursor: paginationResult.continueCursor,
        hasMore: !!paginationResult.continueCursor,
      };
    } catch (error) {
      console.error('페이지네이션 쿼리 오류:', error);
      // 오류가 발생해도 빈 결과를 반환하여 전체 실행이 멈추지 않도록 함
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }
  },
});
