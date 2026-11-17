import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const quizLanguagesTable = defineTable({
  key: v.string(), // 퀴즈/답변/옵션의 고유 키 (예: "20250225_0001_key", "20250225_0001_answer", "20250225_0001_opt1")
  language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')), // 지원하는 언어만 허용
  value: v.string(), // 해당 언어의 텍스트 (질문, 답변, 옵션 내용)
  type: v.string(), // "question", "answer", "option" 구분
})
  .index('by_key_and_language', ['key', 'language']) // 퀴즈 키와 언어로 빠르게 조회
  .index('by_key', ['key']) // 퀴즈 키 단독 조회
  .index('by_language_and_key', ['language', 'key']) // 언어와 키로 조회하는 인덱스 추가
  .index('by_language', ['language']); // 언어로만 조회하는 인덱스
