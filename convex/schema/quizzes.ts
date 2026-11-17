import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const quizzesTable = defineTable({
  categoryId: v.id('categories'),
  level: v.number(),
  key: v.string(),
  answerKey: v.string(),
  indexes: v.array(v.string()),
  options: v.array(
    v.object({
      key: v.string(),
      isAnswer: v.optional(v.boolean()),
    }),
  ),
  youtubeUrl: v.optional(v.string()),
  providerId: v.optional(v.id('providers')), // 확정성을 위한 타입. 회사나 개인이 제공한 문제인지 구분하기 위한 필드
  creatorUserId: v.optional(v.id('users')), // 유저 출제 퀴즈의 출제자
})
  .index('by_category', ['categoryId'])
  .index('by_provider', ['providerId'])
  .index('by_category_and_level', ['categoryId', 'level'])
  .index('by_key', ['key'])
  .index('by_creator', ['creatorUserId']);
