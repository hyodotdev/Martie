import {v} from 'convex/values';

/**
 * 페이지네이션 옵션을 위한 밸리데이터
 * cursor는 string 또는 undefined(첫 페이지)가 될 수 있음
 * limit은 숫자 또는 undefined(기본값 사용)가 될 수 있음
 */
export const paginationOptsValidator = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};
