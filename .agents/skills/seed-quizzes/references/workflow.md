# 퀴즈 100개 생성 및 시딩

Convex DB에 새로운 퀴즈 100개를 생성하고 시딩합니다.
기존 데이터와 중복되지 않게, 유저가 재밌게 풀 수 있는 고품질 퀴즈를 만듭니다.
**ko, en, ja 3개 언어 모두 지원해야 합니다.**

## 현재 DB 구조 (반드시 준수)

퀴즈 데이터는 **2개 테이블**에 나뉘어 저장됩니다:

**quizzes 테이블** (텍스트 없음, 구조만):
```
{ categoryId, level, key, answerKey, indexes[], options[{key, isAnswer}] }
```

**quizLanguages 테이블** (텍스트 매핑, 언어별 별도 row):
```
{ key: "20260409_0001_key", language: "ko", value: "한국어 질문", type: "question" }
{ key: "20260409_0001_key", language: "en", value: "English question", type: "question" }
{ key: "20260409_0001_key", language: "ja", value: "日本語の質問", type: "question" }
{ key: "20260409_0001_answer", language: "ko", value: "한국어 설명", type: "answer" }
{ key: "20260409_0001_opt1", language: "ko", value: "선택지1", type: "option" }
// ... 각 key마다 ko, en, ja 3개 row
```

**핵심**: 앱은 디바이스 언어에 맞는 quizLanguages row를 가져와서 표시합니다.
ko/en/ja 모두 있어야 어떤 언어 유저든 퀴즈를 볼 수 있습니다.

## 작업 순서

### 1단계: 기존 DB 확인 (중복 방지)

```bash
npx convex run quiz/queries:getAllQuizKeys
```

기존 키 목록을 확인하고, 중복되지 않는 새로운 날짜 키를 사용합니다.
키 형식: `YYYYMMDD_NNNN_key` (오늘 날짜 + 0001~0100)

**중복 확인 (필수)**:
DB의 quizLanguages 테이블에서 기존 퀴즈의 **실제 질문 텍스트**를 확인해야 합니다.

```bash
npx convex run quizLanguage/queries:getByLanguage '{"language": "ko"}'
```

이 결과에서 `type: "question"`인 항목들의 `value`(질문 텍스트)를 모두 수집합니다.
새로 만드는 퀴즈는 기존 퀴즈와 **주제/질문 내용이 겹치지 않아야** 합니다.
비슷한 주제라도 완전히 다른 각도의 질문이어야 합니다.
**시간이 오래 걸리더라도 반드시 DB에서 기존 질문을 확인한 후 새 퀴즈를 생성하세요.**

### 2단계: 퀴즈 시드 파일 생성 (한국어 기준)

`scripts/_seeds/YYYYMMDD_quiz.ts` 파일을 생성합니다.

```typescript
export const basicQuizzes = [
  {
    categoryName: 'BASIC_SCIENCE',
    level: 1,
    key: 'YYYYMMDD_0001_key',
    description: '질문 텍스트 (한국어)',
    answerKey: 'YYYYMMDD_0001_answer',
    answerDescription: '정답 설명 텍스트 (한국어)',
    indexes: ['키워드1', '키워드2'],
    options: [
      { key: 'YYYYMMDD_0001_opt1', description: '선택지1', isAnswer: false },
      { key: 'YYYYMMDD_0001_opt2', description: '선택지2', isAnswer: true },
      { key: 'YYYYMMDD_0001_opt3', description: '선택지3', isAnswer: false },
      { key: 'YYYYMMDD_0001_opt4', description: '선택지4', isAnswer: false },
    ],
  },
  // ... 총 100개
];
export default basicQuizzes;
```

### 3단계: 번역 파일 생성 (en, ja)

`scripts/_seeds/YYYYMMDD_en.json`, `scripts/_seeds/YYYYMMDD_ja.json` 파일을 생성합니다.

```json
{
  "YYYYMMDD_0001_key": "English question text",
  "YYYYMMDD_0001_answer": "English answer explanation",
  "YYYYMMDD_0001_opt1": "Option 1 in English",
  "YYYYMMDD_0001_opt2": "Option 2 in English",
  "YYYYMMDD_0001_opt3": "Option 3 in English",
  "YYYYMMDD_0001_opt4": "Option 4 in English",
  ...
}
```

각 파일에 600개 항목 (100퀴즈 x 6키). 번역은 자연스러운 해당 언어로.

### 4단계: 카테고리 (랜덤 분배)

아래 카테고리 중에서 **랜덤하게** 분배합니다. 균등 분배할 필요 없이 자연스럽게 섞어주세요.
새로운 카테고리가 필요하면 추가해도 됩니다 (seeds.ts의 insertCategories에도 추가 필요).

- GENERAL_KNOWLEDGE (일반 상식)
- BASIC_SCIENCE (기초 과학)
- WORLD_HISTORY (세계사)
- GEOGRAPHY_AND_CULTURE (지리·세계 문화)
- LAW_AND_RIGHTS (법·권리)
- ECONOMY_AND_FINANCE (경제·금융)
- FIRST_AID_AND_SAFETY (응급처치·생활 안전)
- LIFE_HACKS (생활 꿀팁)
- DIGITAL_LITERACY (디지털 리터러시)
- POP_CULTURE (대중문화 상식)
- HEALTH_AND_NUTRITION (건강과 영양)
- PSYCHOLOGY (심리학)
- ENVIRONMENT_AND_CLIMATE (환경과 기후)
- TECHNOLOGY_AND_AI (기술과 AI)
- FOOD_AND_COOKING (음식과 요리)
- SPORTS (스포츠)
- SPACE_AND_ASTRONOMY (우주와 천문학)
- ANIMALS_AND_NATURE (동물과 자연)
- ART_AND_MUSIC (예술과 음악)
- LANGUAGE_AND_COMMUNICATION (언어와 소통)
- 필요시 새 카테고리 추가 가능

### 퀴즈 품질 필수 요구사항

- 사실에 기반한 정확한 정보 (틀린 정보 절대 불가)
- 질문은 호기심을 자극하는 톤
- 정답 설명은 "왜" 그 답이 맞는지 교육적이고 재미있게 (1~2문장)
- 오답 선택지도 그럴듯하게 (너무 황당한 오답 금지)
- 정답 위치는 opt1~opt4 중 랜덤 분포
- 레벨 1~3 골고루 (쉬움/보통/약간 어려움)
- 각 퀴즈에 isAnswer: true 정확히 1개
- 기존 퀴즈와 주제/질문 겹치지 않도록
- **한국어**: 자연스럽고 읽기 쉬운 한국어
- **영어**: natural, fluent English (not literal translation)
- **일본어**: 자연스러운 일본어 (です/ます form)

### 5단계: seeds.ts 수정 + 시딩

`convex/seeds.ts`에서 import 변경 + 임시 시딩 함수 추가:

```typescript
import quizzesToImport from '../scripts/_seeds/YYYYMMDD_quiz';

// 하단에 임시 추가
export const importLanguagesFromSeedData = action({
  args: {},
  handler: async (ctx) => {
    const rawQuizzes = quizzesToImport as RawQuiz[];
    const enData = (await import('../scripts/_seeds/YYYYMMDD_en.json')).default;
    const jaData = (await import('../scripts/_seeds/YYYYMMDD_ja.json')).default;

    const langData: {key: string; language: 'ko' | 'en' | 'ja'; value: string; type: string}[] = [];
    const getType = (key: string) => key.endsWith('_key') ? 'question' : key.endsWith('_answer') ? 'answer' : 'option';

    // ko from seed file
    for (const quiz of rawQuizzes) {
      langData.push({key: quiz.key, language: 'ko', value: quiz.description, type: 'question'});
      langData.push({key: quiz.answerKey, language: 'ko', value: quiz.answerDescription, type: 'answer'});
      for (const opt of quiz.options) {
        langData.push({key: opt.key, language: 'ko', value: opt.description, type: 'option'});
      }
    }
    // en from JSON
    for (const [key, value] of Object.entries(enData)) {
      langData.push({key, language: 'en', value: value as string, type: getType(key)});
    }
    // ja from JSON
    for (const [key, value] of Object.entries(jaData)) {
      langData.push({key, language: 'ja', value: value as string, type: getType(key)});
    }

    for (let i = 0; i < langData.length; i += 500) {
      await ctx.runMutation(internal.quizLanguage.mutations.insertQuizLanguageBatch, {
        languages: langData.slice(i, i + 500),
      });
      console.log(`  ✓ 배치 ${Math.floor(i / 500) + 1} 완료`);
    }
    console.log(`✅ ${langData.length}개 언어 데이터 삽입 완료! (ko/en/ja)`);
  },
});
```

**dev에 push + 시딩:**

```bash
npx convex dev --once --typecheck=disable
npx convex run seeds:importAllQuizzes
npx convex run seeds:importLanguagesFromSeedData
```

**prod에도 push + 시딩** (.env.prod에서 CONVEX_DEPLOYMENT 값을 사용):

```bash
# .env.prod의 CONVEX_DEPLOYMENT 값을 확인하여 사용
source .env.prod 2>/dev/null
npx convex deploy --typecheck=disable
npx convex run seeds:importAllQuizzes
npx convex run seeds:importLanguagesFromSeedData
```

또는 직접 지정:

```bash
CONVEX_DEPLOYMENT="$(grep CONVEX_DEPLOYMENT .env.prod | cut -d= -f2)" npx convex deploy --typecheck=disable
CONVEX_DEPLOYMENT="$(grep CONVEX_DEPLOYMENT .env.prod | cut -d= -f2)" npx convex run seeds:importAllQuizzes
CONVEX_DEPLOYMENT="$(grep CONVEX_DEPLOYMENT .env.prod | cut -d= -f2)" npx convex run seeds:importLanguagesFromSeedData
```

### 6단계: 정리

- seeds.ts에서 임시 함수(importLanguagesFromSeedData) 제거
- seeds.ts의 import는 새 시드 파일로 유지
- dev + prod 모두 최종 push:

```bash
npx convex dev --once --typecheck=disable
CONVEX_DEPLOYMENT="$(grep CONVEX_DEPLOYMENT .env.prod | cut -d= -f2)" npx convex deploy --typecheck=disable
```

### 7단계: 검증

앱에서 퀴즈 화면 진입:
- 디바이스 한국어 → 한국어 퀴즈
- 디바이스 영어 → 영어 퀴즈
- 디바이스 일본어 → 일본어 퀴즈
