import {internalAction, internalMutation} from './_generated/server';
import {api, internal} from './_generated/api';
import {Id} from './_generated/dataModel';
import quizzesToImport from '../scripts/_seeds/20260528_quiz';

// 퀴즈 임포트 결과 타입 정의
type QuizImportResult = {
  name: string;
  status: 'success' | 'skipped';
  quizCount?: number;
  reason?: string;
};

// 전체 퀴즈 임포트 결과 타입 정의
type ImportAllQuizzesResult = {
  success: boolean;
  results: QuizImportResult[];
};

/**
 * 카테고리 초기화 Mutation
 * @see /convex/schema.ts - 데이터베이스 스키마 정의
 * @see /src/utils/categoriesMap.ts - 로컬라이제이션 매핑
 */
export const insertCategories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const CATEGORIES: {name: string; description: string}[] = [
      {name: 'GENERAL_KNOWLEDGE', description: '일반 상식'},
      {name: 'BASIC_SCIENCE', description: '기초 과학'},
      {name: 'WORLD_HISTORY', description: '세계사'},
      {name: 'GEOGRAPHY_AND_CULTURE', description: '지리·세계 문화'},
      {name: 'LAW_AND_RIGHTS', description: '법·권리'},
      {name: 'ECONOMY_AND_FINANCE', description: '경제·금융'},
      {name: 'FIRST_AID_AND_SAFETY', description: '응급처치·생활 안전'},
      {name: 'LIFE_HACKS', description: '생활 꿀팁'},
      {name: 'DIGITAL_LITERACY', description: '디지털 리터러시'},
      {name: 'POP_CULTURE', description: '대중문화 상식'},
      {name: 'HEALTH_AND_NUTRITION', description: '건강과 영양'},
      {name: 'PSYCHOLOGY', description: '심리학'},
      {name: 'ENVIRONMENT_AND_CLIMATE', description: '환경과 기후'},
      {name: 'TECHNOLOGY_AND_AI', description: '기술과 AI'},
      {name: 'FOOD_AND_COOKING', description: '음식과 요리'},
      {name: 'SPORTS', description: '스포츠'},
      {name: 'SPACE_AND_ASTRONOMY', description: '우주와 천문학'},
      {name: 'ANIMALS_AND_NATURE', description: '동물과 자연'},
      {name: 'ART_AND_MUSIC', description: '예술과 음악'},
      {name: 'LANGUAGE_AND_COMMUNICATION', description: '언어와 소통'},
    ];

    await Promise.all(
      CATEGORIES.map((category) => ctx.db.insert('categories', category)),
    );

    console.log('✅ Categories inserted successfully!');
  },
});

// 퀴즈 데이터의 원시 타입 정의
interface RawQuiz {
  categoryName: string;
  level: number;
  key: string;
  description: string; // 원본 데이터에 포함
  answerKey: string;
  answerDescription: string; // 원본 데이터에 포함
  indexes: string[];
  options: {
    key: string;
    description: string; // 원본 데이터에 포함
    isAnswer: boolean;
  }[];
}

// 1. 전체 퀴즈 임포트 Action
export const importAllQuizzes = internalAction({
  args: {},
  handler: async (ctx): Promise<ImportAllQuizzesResult> => {
    console.log('🚀 퀴즈 임포트 시작...');

    // 카테고리별 퀴즈 개수를 추적하기 위한 Map (for tracking and reporting)
    const categoryQuizCounts = new Map<string, number>();
    // 스킵된 카테고리를 추적하기 위한 Set
    const skippedCategories = new Set<string>();

    // 데이터 파일 로드
    let rawQuizzes: RawQuiz[];
    try {
      rawQuizzes = quizzesToImport as RawQuiz[];
      if (
        !rawQuizzes ||
        !Array.isArray(rawQuizzes) ||
        rawQuizzes.length === 0
      ) {
        console.error('❌ 퀴즈 데이터 없거나 잘못된 형식입니다');
        throw new Error(`Quiz data is missing or invalid`);
      }

      console.log(`✅ ${rawQuizzes.length}개의 퀴즈 데이터를 로드했습니다`);
    } catch (error) {
      console.error(`❌ 퀴즈 데이터 파일 로드 실패:`, error);
      return {
        success: false,
        results: [
          {
            name: 'All Categories',
            status: 'skipped',
            reason: `Quiz data files not found or incomplete: ${error}`,
          },
        ],
      };
    }

    // 모든 카테고리 불러오기
    console.log('🔍 카테고리 목록 조회 중...');
    const allCategories = await ctx.runQuery(api.category.queries.list, {});

    if (!allCategories || allCategories.length === 0) {
      console.error(
        '❌ 카테고리 데이터가 없습니다! 먼저 카테고리를 삽입해주세요.',
      );
      return {
        success: false,
        results: [
          {
            name: 'All Categories',
            status: 'skipped',
            reason:
              'No categories available. Please run insertCategories first',
          },
        ],
      };
    }

    console.log(`✅ ${allCategories.length}개의 카테고리를 발견했습니다`);

    // 카테고리 이름 -> ID 매핑 생성
    const categoryNameToIdMap = new Map<string, string>();
    allCategories.forEach((category) => {
      categoryNameToIdMap.set(category.name, category._id);
    });

    // 퀴즈 데이터 가공
    const basicQuizzes = rawQuizzes.map((quiz: RawQuiz) => ({
      categoryName: quiz.categoryName,
      level: quiz.level,
      key: quiz.key,
      answerKey: quiz.answerKey,
      indexes: quiz.indexes,
      options: quiz.options.map((opt) => ({
        key: opt.key,
        isAnswer: opt.isAnswer,
      })),
    }));

    // 중복 퀴즈 체크
    const allQuizKeys = basicQuizzes.map((quiz) => quiz.key);
    console.log(`👀 ${allQuizKeys.length}개의 퀴즈 키 중복 체크 중...`);

    const existingQuizzes = await ctx.runQuery(api.quiz.queries.getByKeys, {
      keys: allQuizKeys,
    });

    const existingKeysSet = new Set(existingQuizzes.map((q) => q.key));
    console.log(`✓ ${existingKeysSet.size}개의 중복 퀴즈 발견됨`);

    // 퀴즈를 key 기준으로 오름차순 정렬하고 중복 제거
    const sortedQuizzes = basicQuizzes
      .filter((quiz) => !existingKeysSet.has(quiz.key))
      .sort((a, b) => {
        // Extract numerical parts from keys for better sorting
        const extractNumber = (key: string): number => {
          // Assuming keys follow the pattern like "20250229_0150_key"
          const match = key.match(/(\d+)_key$/);
          if (match && match[1]) {
            return parseInt(match[1], 10);
          }

          // If the pattern doesn't match, fall back to string comparison
          return 0;
        };

        // Extract date parts for primary sorting (e.g., "20250229")
        const extractDate = (key: string): string => {
          const parts = key.split('_');
          return parts[0] || '';
        };

        // First sort by date part
        const dateA = extractDate(a.key);
        const dateB = extractDate(b.key);

        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        // Then sort by numerical part
        const numA = extractNumber(a.key);
        const numB = extractNumber(b.key);

        return numA - numB; // Numerical sort instead of lexicographical
      });

    console.log(
      `✅ ${sortedQuizzes.length}개의 새로운 퀴즈를 삽입할 준비가 완료되었습니다`,
    );

    // For debugging - show first few sorted keys
    if (sortedQuizzes.length > 0) {
      console.log('샘플 정렬 결과 (처음 5개):');
      sortedQuizzes.slice(0, 5).forEach((quiz) => {
        console.log(`  - ${quiz.key}`);
      });

      // Also show the last few keys to verify sequence
      console.log('샘플 정렬 결과 (마지막 5개):');
      sortedQuizzes.slice(-5).forEach((quiz) => {
        console.log(`  - ${quiz.key}`);
      });
    }

    // 배치 처리 함수 - 카테고리 구분 없이 순차적으로 처리
    const processBatch = async (quizzes: typeof sortedQuizzes) => {
      console.log(`🔄 총 ${quizzes.length}개의 퀴즈 삽입 진행 중...`);

      // 배치 단위로 처리
      const batchSize = 500; // Convex 배치 제한에 맞게 조정
      let totalInserted = 0;

      for (let i = 0; i < quizzes.length; i += batchSize) {
        const batch = quizzes.slice(i, i + batchSize);
        const batchWithCategoryIds = [];

        // 각 퀴즈에 카테고리 ID 매핑
        for (const quiz of batch) {
          const categoryId = categoryNameToIdMap.get(quiz.categoryName);

          // 카테고리가 없으면 해당 퀴즈 스킵
          if (!categoryId) {
            skippedCategories.add(quiz.categoryName);
            continue;
          }

          // 해당 카테고리 카운터 초기화 (결과 집계용)
          if (!categoryQuizCounts.has(quiz.categoryName)) {
            categoryQuizCounts.set(quiz.categoryName, 0);
          }

          // categoryName 제거하고 categoryId 추가
          const {categoryName, ...quizWithoutCategoryName} = quiz;
          batchWithCategoryIds.push({
            ...quizWithoutCategoryName,
            categoryId: categoryId as Id<'categories'>,
          });
        }

        // 유효한 카테고리 ID가 있는 퀴즈만 삽입
        if (batchWithCategoryIds.length > 0) {
          try {
            await ctx.runMutation(internal.quiz.mutations.upsertQuizBatch, {
              quizzes: batchWithCategoryIds,
            });

            // 성공한 퀴즈를 카테고리별로 카운팅
            batchWithCategoryIds.forEach((quiz) => {
              const originalQuiz = batch.find((q) => q.key === quiz.key);
              if (originalQuiz) {
                const count =
                  categoryQuizCounts.get(originalQuiz.categoryName) || 0;
                categoryQuizCounts.set(originalQuiz.categoryName, count + 1);
              }
            });

            totalInserted += batchWithCategoryIds.length;
            console.log(
              `  ✓ 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(quizzes.length / batchSize)} 완료: ${batchWithCategoryIds.length}개 삽입`,
            );
          } catch (error) {
            console.error(`  ❌ 배치 삽입 실패:`, error);
          }
        } else {
          console.log(
            `  ⚠️ 배치 ${Math.floor(i / batchSize) + 1}: 유효한 퀴즈 없음`,
          );
        }
      }

      console.log(`✅ 총 ${totalInserted}개 퀴즈 삽입 완료`);
    };

    // 모든 퀴즈를 단일 배치로 처리
    await processBatch(sortedQuizzes);

    // 최종 결과 배열 생성
    const results: QuizImportResult[] = [];

    // 성공적으로 삽입된 카테고리 결과 추가
    for (const [name, quizCount] of categoryQuizCounts) {
      results.push({
        name,
        quizCount,
        status: 'success',
      });
    }

    // 스킵된 카테고리 결과 추가
    for (const name of skippedCategories) {
      results.push({
        name,
        status: 'skipped',
        reason: 'Category not found',
      });
    }

    // 카테고리별 삽입 결과 요약 표시
    console.log('\n📊 카테고리별 퀴즈 삽입 결과 요약:');
    console.log('----------------------------------------');

    // 삽입된 카테고리 표시
    let totalInserted = 0;
    if (categoryQuizCounts.size > 0) {
      for (const [name, count] of categoryQuizCounts) {
        console.log(`✅ ${name}: ${count}개 퀴즈 추가됨`);
        totalInserted += count;
      }
    }

    // 스킵된 카테고리 표시
    if (skippedCategories.size > 0) {
      console.log('\n⚠️ 스킵된 카테고리:');
      for (const name of skippedCategories) {
        console.log(`⚠️ ${name}: 카테고리가 존재하지 않음`);
      }
    }

    console.log('----------------------------------------');
    console.log(
      `🏁 총 결과: ${totalInserted}개 퀴즈 추가됨, ${categoryQuizCounts.size}개 카테고리 처리됨`,
    );

    // 임포트 성공 여부 결정 (하나라도 성공적으로 삽입된 카테고리가 있으면 성공)
    const isSuccess = categoryQuizCounts.size > 0;

    return {
      success: isSuccess,
      results,
    };
  },
});
