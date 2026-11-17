# Phase 2: 더 하게 만들기

## 목표

Phase 1("매일 오게 만들기") 위에, "2분 하러 왔다가 10분 하게 만들기" 루프를 추가한다.

## 핵심 변경

블로그 탭 → **"발견" 탭**으로 리포지셔닝

---

## 1. 오답 복습

### 컨셉
- 틀린 문제를 자동 수집
- 간격반복으로 재출제 (1일 → 3일 → 7일)
- Martie AI 챗으로 설명 연결

### 복습 대기열 로직
```
틀린 문제 발생 (quizResults.isCorrect === false)
    ↓
복습 스케줄 생성:
  - nextReviewAt = now + 1일 (첫 복습)
  - reviewStage = 0
    ↓
복습 시 정답:
  - reviewStage 0→1: nextReviewAt = now + 3일
  - reviewStage 1→2: nextReviewAt = now + 7일
  - reviewStage 2→3: 마스터 완료 (복습 대기열에서 제거)
    ↓
복습 시 오답:
  - reviewStage = 0으로 리셋
  - nextReviewAt = now + 1일
```

### DB (새 테이블)
```
reviewQueue: {
  userId: Id<"users">,
  quizId: Id<"quizzes">,
  reviewStage: number,       // 0, 1, 2, 3(완료)
  nextReviewAt: string,      // ISO date
  createdAt: string
}
```

### UI
- 발견 탭에 "오답 복습 N개 대기" 카드
- 탭하면 복습 퀴즈 플로우 (기존 QuizView 재활용)
- 문제 풀고 나서 "Martie에게 물어보기" 버튼 → AI 챗 연결

---

## 2. 발견 탭 (블로그 탭 리포지셔닝)

### 레이아웃
```
┌──────────────────────────┐
│  📊 나의 상식 레이더       │
│  [레이더 차트]             │
│  💪 강점: 역사, 과학       │
│  📚 약점: 법, 경제         │
├──────────────────────────┤
│  ❌ 오답 복습 3개 대기      │
│  [복습하기]                │
├──────────────────────────┤
│  📖 추천 읽기              │
│  (약한 카테고리 블로그 우선) │
└──────────────────────────┘
```

### 레이더 차트
- 기존 `getResultsStatsByCategory` 쿼리 활용
- `react-native-svg`로 다각형 차트 구현
- 카테고리별 정답률(winRate)을 축으로 표시
- 상위 3개 = 강점, 하위 3개 = 약점 표시

### 추천 블로그
- 약한 카테고리(정답률 낮은)의 블로그를 상단에 노출
- 기존 블로그 목록 UI 재활용

---

## 3. 이전 버전 호환

- `reviewQueue` 테이블 새로 추가 (기존 무영향)
- 블로그 탭 아이콘/이름만 변경 (기존 블로그 컨텐츠 유지)
- 기존 `quizResults`, `rankCategories` 데이터 그대로 활용
