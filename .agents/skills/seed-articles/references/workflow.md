# 상식 블로그 글 20개 생성 및 시딩

Convex DB에 상식 블로그 글 20개를 생성하고 시딩합니다.
기존 데이터와 중복되지 않게, 유저가 재미있게 읽을 수 있는 고품질 상식 글을 만듭니다.
**ko, en, ja 3개 언어 모두 지원해야 합니다.**

## 현재 DB 구조 (반드시 준수)

블로그 데이터는 **2개 테이블**에 나뉘어 저장됩니다:

**articles 테이블** (메타데이터):
```
{ key, categoryName, thumbnailUrl, publishedAt }
```

**articleLanguages 테이블** (텍스트 매핑, 언어별 별도 row):
```
{ key: "20260411_article_0001_title", language: "ko", value: "제목", type: "title" }
{ key: "20260411_article_0001_title", language: "en", value: "Title", type: "title" }
{ key: "20260411_article_0001_title", language: "ja", value: "タイトル", type: "title" }
{ key: "20260411_article_0001_summary", language: "ko", value: "요약", type: "summary" }
{ key: "20260411_article_0001_content", language: "ko", value: "본문 내용...", type: "content" }
// ... 각 key마다 ko, en, ja 3개 row
```

**핵심**: 앱은 디바이스 언어에 맞는 articleLanguages row를 가져와서 표시합니다.

## 작업 순서

### 1단계: 기존 DB 확인 (중복 방지)

```bash
npx convex run article/queries:getAllArticleKeys
```

기존 키 목록을 확인하고, 중복되지 않는 새로운 날짜 키를 사용합니다.
키 형식: `YYYYMMDD_article_NNNN` (오늘 날짜 + article + 0001~0020)

**중복 확인 (필수)**:
DB의 articleLanguages 테이블에서 기존 글의 **실제 제목 텍스트**를 확인해야 합니다.

```bash
npx convex run articleLanguage/queries:getByLanguage '{"language": "ko"}'
```

이 결과에서 `type: "title"`인 항목들의 `value`(제목 텍스트)를 모두 수집합니다.
새로 만드는 글은 기존 글과 **주제/제목이 겹치지 않아야** 합니다.
**시간이 오래 걸리더라도 반드시 DB에서 기존 글을 확인한 후 새 글을 생성하세요.**

### 2단계: 블로그 글 시드 파일 생성

`scripts/_seeds/YYYYMMDD_articles.ts` 파일을 생성합니다.

```typescript
export const articles = [
  {
    key: 'YYYYMMDD_article_0001',
    categoryName: 'BASIC_SCIENCE',
    thumbnailUrl: 'https://images.unsplash.com/photo-XXXX?w=800&q=80',
    publishedAt: 'YYYY-MM-DD',
    title_ko: '한국어 제목',
    title_en: 'English Title',
    title_ja: '日本語タイトル',
    summary_ko: '한국어 요약 (1~2문장)',
    summary_en: 'English summary (1-2 sentences)',
    summary_ja: '日本語の要約（1〜2文）',
    content_ko: '한국어 본문 (3~5단락, 읽기 쉽고 재미있게)',
    content_en: 'English content (3-5 paragraphs, engaging and fun)',
    content_ja: '日本語の本文（3〜5段落、読みやすく楽しい）',
  },
  // ... 총 20개 (카테고리당 1개씩)
];
export default articles;
```

### 3단계: 썸네일 이미지

각 글의 `thumbnailUrl`에는 Unsplash 이미지 URL을 사용합니다.
- 형식: `https://images.unsplash.com/photo-XXXXXXXXXXXX-XXXXXXXXXXXX?w=800&q=80`
- **중요: 카테고리가 아니라 개별 글의 주제에 정확히 맞는 이미지를 사용해야 합니다**
  - 예: 개미 글에는 개미 사진, 올림픽 글에는 올림픽/스포츠 사진
  - 같은 카테고리라도 글마다 다른 이미지를 써야 합니다
- **반드시 WebSearch로 "unsplash [주제 키워드]"를 검색하여 실제 존재하는 이미지 URL을 찾으세요**
- 찾은 URL을 `curl`로 HTTP 200 응답이 오는지 검증하세요
- 404가 나오는 URL은 절대 사용하지 마세요

### 4단계: 카테고리 (랜덤 분배)

아래 카테고리 중에서 **랜덤하게** 분배합니다:

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

### 블로그 글 품질 필수 요구사항

- 사실에 기반한 정확한 정보 (틀린 정보 절대 불가)
- 제목은 호기심을 자극하는 톤 ("왜 ~일까?", "~의 비밀", "알고 보면 놀라운 ~")
- 요약은 핵심을 1~2문장으로 (카드에 표시됨)
- 본문은 3~5단락, 읽기 쉽고 재미있게
  - 첫 단락: 흥미로운 도입부
  - 중간 단락: 핵심 설명 + 재미있는 사실
  - 마지막 단락: 마무리 + "알아두면 좋은" 스타일
- **한국어**: 자연스럽고 읽기 쉬운 한국어 (요/답니다 체)
- **영어**: Natural, fluent English (not literal translation)
- **일본어**: 자연스러운 일본어 (です/ます form)
- 기존 글과 주제/제목 겹치지 않도록

### 5단계: seeds.ts 수정 + 시딩

`convex/seeds.ts`에 임시 시딩 함수 추가:

```typescript
import articlesToImport from '../scripts/_seeds/YYYYMMDD_articles';

// 하단에 임시 추가
export const importArticles = action({
  args: {},
  handler: async (ctx) => {
    const rawArticles = articlesToImport;

    // articles 테이블에 삽입
    const articleData = rawArticles.map((a) => ({
      key: a.key,
      categoryName: a.categoryName,
      thumbnailUrl: a.thumbnailUrl,
      publishedAt: a.publishedAt,
    }));

    for (let i = 0; i < articleData.length; i += 500) {
      await ctx.runMutation(internal.article.mutations.insertArticleBatch, {
        articles: articleData.slice(i, i + 500),
      });
    }
    console.log(`✅ ${articleData.length}개 아티클 삽입 완료`);

    // articleLanguages 테이블에 삽입
    const langData: {key: string; language: 'ko' | 'en' | 'ja'; value: string; type: string}[] = [];

    for (const article of rawArticles) {
      // title
      langData.push({key: `${article.key}_title`, language: 'ko', value: article.title_ko, type: 'title'});
      langData.push({key: `${article.key}_title`, language: 'en', value: article.title_en, type: 'title'});
      langData.push({key: `${article.key}_title`, language: 'ja', value: article.title_ja, type: 'title'});
      // summary
      langData.push({key: `${article.key}_summary`, language: 'ko', value: article.summary_ko, type: 'summary'});
      langData.push({key: `${article.key}_summary`, language: 'en', value: article.summary_en, type: 'summary'});
      langData.push({key: `${article.key}_summary`, language: 'ja', value: article.summary_ja, type: 'summary'});
      // content
      langData.push({key: `${article.key}_content`, language: 'ko', value: article.content_ko, type: 'content'});
      langData.push({key: `${article.key}_content`, language: 'en', value: article.content_en, type: 'content'});
      langData.push({key: `${article.key}_content`, language: 'ja', value: article.content_ja, type: 'content'});
    }

    for (let i = 0; i < langData.length; i += 500) {
      await ctx.runMutation(internal.articleLanguage.mutations.insertArticleLanguageBatch, {
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
npx convex run seeds:importArticles
```

**prod에도 push + 시딩:**

```bash
CONVEX_DEPLOYMENT='prod:proficient-vole-163' npx convex deploy --typecheck=disable
CONVEX_DEPLOYMENT='prod:proficient-vole-163' npx convex run seeds:importArticles
```

### 5.5단계: 썸네일 이미지 Convex storage 업로드

시딩 후 반드시 썸네일을 Convex storage에 업로드합니다.
이미 `convex/article/actions.ts`에 `uploadThumbnails` action이 있습니다.
이 action은 각 아티클의 `thumbnailUrl`에서 이미지를 다운로드하여 Convex `_storage`에 저장하고, `thumbnailStorageId`를 업데이트합니다.
앱 UI에서는 `storageThumbnailUrl`을 우선 사용하고, 없으면 `thumbnailUrl`로 폴백합니다.

```bash
# dev 썸네일 업로드
npx convex run article/actions:uploadThumbnails

# prod 썸네일 업로드
CONVEX_DEPLOYMENT='prod:proficient-vole-163' npx convex run article/actions:uploadThumbnails
```

### 6단계: 정리

- seeds.ts에서 임시 함수(importArticles) 제거
- seeds.ts의 import도 제거
- dev + prod 모두 최종 push:

```bash
npx convex dev --once --typecheck=disable
CONVEX_DEPLOYMENT='prod:proficient-vole-163' npx convex deploy --typecheck=disable
```
