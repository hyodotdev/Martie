# Phase 1: Daily Loop System

## 목표

Martie를 "퀴즈 풀고 끝"인 앱에서 "매일 2분 상식 루틴"으로 전환한다.
검증된 패턴(Wordle 공유카드, Duolingo 스트릭/리그)을 Martie 구조에 맞게 조합한다.

## 핵심 지표

| 지표 | 현재(추정) | 목표 |
|------|-----------|------|
| D1 리텐션 | ~20% | 40%+ |
| D7 리텐션 | ~5% | 15%+ |
| DAU/MAU | ~10% | 25%+ |
| 바이럴 계수 | 0 | 0.3+ (공유카드) |

---

## 1. 오늘의 퀴즈 (Daily Challenge)

### 컨셉
- 매일 자정(UTC) 자동 생성, 전 유저가 **같은 5문제**를 품
- **벌브 소모 없음** (진입장벽 제로)
- 하루 1번만 가능 (희소성)
- 결과를 이모지 공유카드로 공유 (바이럴)

### 문제 선정 로직
1. 카테고리 20개를 날짜 기준 로테이션 (day % 20)
2. 해당 카테고리에서 랜덤 5문제 선정
3. `dailyChallenges` 테이블에 저장

### 공유카드 포맷
```
오늘의 Martie #127

🟩🟩⬛🟩🟩  4/5
⏱ 42초  🔥 23일 연속

https://hyo.dev/martie
```

- 🟩 = 정답, ⬛ = 오답
- 퀴즈 번호 = 앱 출시 후 경과일
- 링크 클릭 → 앱스토어/플레이스토어

### DB
```
dailyChallenges: {
  date: string,           // "2026-04-12"
  quizIds: Id<"quizzes">[], // 5개
  categoryId: Id<"categories">
}

quizResults: {
  ...existing,
  isDaily: optional(boolean)  // 데일리 구분
}
```

### Cron
- `generateDailyChallenge`: 매일 00:00 UTC 실행
- 이미 해당 날짜 데이터 있으면 스킵 (멱등성)

### 유저 플로우
```
홈 → "오늘의 퀴즈" 카드 탭 → 5문제 풀기 → 결과 + 공유카드 → 공유
                                                    ↓
                                              스트릭 +1, XP +정답수×10
```

---

## 2. 스트릭 (Streak)

### 컨셉
- 오늘의 퀴즈 완료 시 스트릭 +1
- 하루라도 안 하면 리셋 (0으로)
- 스트릭 프리즈: 벌브 10개로 구매, 하루 보호

### 로직
```
오늘의 퀴즈 완료 시:
  if lastStreakDate === 어제 → currentStreak + 1
  if lastStreakDate === 오늘 → 변동 없음 (이미 완료)
  if lastStreakDate < 어제:
    if streakFreezeCount > 0 → 프리즈 소모, currentStreak 유지
    else → currentStreak = 1 (리셋)
  
  lastStreakDate = 오늘
  longestStreak = max(longestStreak, currentStreak)
```

### DB
```
userProfiles: {
  ...existing,
  currentStreak: optional(number),     // 현재 연속일
  longestStreak: optional(number),     // 최장 기록
  lastStreakDate: optional(string),    // 마지막 완료일
  streakFreezeCount: optional(number)  // 프리즈 보유수
}
```

### UI
- 홈 상단에 🔥 아이콘 + 연속일 표시
- 스트릭 끊기 위험 시 푸시 알림 (오후 9시)

---

## 3. 리그 (League)

### 컨셉
- 주간 경쟁, 30명 그룹
- 5단계: Bronze → Silver → Gold → Diamond → Master
- 매주 월요일 00:00 UTC 리셋
- 상위 5명 승격, 하위 5명 강등

### XP 획득
| 행동 | XP |
|------|-----|
| 오늘의 퀴즈 정답 1개 | +10 |
| 일반 퀴즈 정답 1개 | +5 |
| 오늘의 퀴즈 올클리어 | +20 보너스 |
| 퀴즈 레벨 통과 | +15 |

### 그룹 배정
- 첫 참여 시 Bronze 리그 배정
- 같은 tier의 유저 30명을 하나의 groupId로 묶음
- 30명 미만이면 봇(가상 유저)으로 채움 (초기)

### 주간 리셋 (Cron: 매주 월요일 00:00 UTC)
1. 각 그룹별 weeklyXp 기준 정렬
2. 상위 5명 → 다음 tier 승격
3. 하위 5명 → 이전 tier 강등 (Bronze는 강등 없음)
4. 전원 weeklyXp = 0 리셋
5. 새 그룹 재배정

### DB
```
leagues: {
  userId: Id<"users">,
  tier: string,         // "bronze"|"silver"|"gold"|"diamond"|"master"
  weeklyXp: number,
  weekStart: string,    // "2026-04-07"
  groupId: string
}
```

---

## 4. 홈 화면 리디자인

### Before (현재)
```
┌──────────────────┐
│   Martie 이미지    │
│   Lv. 5          │
│                  │
│  [퀴즈 풀기]      │
└──────────────────┘
```

### After
```
┌──────────────────────────┐
│  🔥 12일 연속     💡 5    │  ← 스트릭 + 벌브
├──────────────────────────┤
│  📋 오늘의 퀴즈           │
│  🧪 과학 · 5문제          │
│  [도전하기]               │  ← 데일리 챌린지 카드
├──────────────────────────┤
│  🏆 골드 리그 · 7위/30    │
│  ▓▓▓▓▓▓░░░░  +45 XP     │  ← 리그 프로그레스
├──────────────────────────┤
│  📚 이어서 풀기            │
│  역사 Lv.3               │  ← 기존 퀴즈 진입
│  [계속하기]                │
└──────────────────────────┘
```

### 컴포넌트 구조
- `DailyStreakBanner` — 스트릭 + 벌브 상단바
- `DailyChallengeCard` — 오늘의 퀴즈 카드 (완료 시 결과 표시)
- `LeagueProgressCard` — 리그 현황 카드
- `ContinueQuizCard` — 기존 퀴즈 계속하기

### 데일리 퀴즈 완료 후 카드 변화
```
┌──────────────────────────┐
│  ✅ 오늘의 퀴즈 완료!      │
│  🟩🟩⬛🟩🟩  4/5          │
│  [결과 공유하기]           │
└──────────────────────────┘
```

---

## 5. 공유카드 (Share Card)

### 구현 방식
- `react-native-view-shot`으로 카드 영역 캡처
- `expo-sharing`으로 네이티브 공유 (기존 패턴 활용)

### 카드 디자인 요소
- Martie 로고 (작게)
- 퀴즈 번호 (#일차)
- 이모지 결과 (🟩⬛)
- 정답 수 / 총 문제 수
- 소요 시간
- 스트릭 일수
- 앱 링크

### 텍스트 공유 (클립보드 복사)
```
오늘의 Martie #127 🐦

🟩🟩⬛🟩🟩  4/5
⏱ 42초  🔥 23일

https://hyo.dev/martie
```

---

## 6. 이전 버전 호환성

- 모든 새 필드는 `v.optional()` → 기존 쿼리 정상 동작
- 새 테이블(`dailyChallenges`, `leagues`)은 독립적 → 기존 코드 무영향
- `saveQuizResult`에 `isDaily` 파라미터 추가 (optional) → 기존 호출 호환
- 홈 화면 변경은 앱 업데이트 후에만 반영
- 기존 "퀴즈 풀기" 버튼 기능 유지 (하단 "이어서 풀기"로 이동)

---

## 7. 구현 순서

### Backend (Convex)
1. `convex/dailyChallenge/` — 생성 cron + 조회 쿼리
2. `convex/streak/` — 스트릭 업데이트 뮤테이션
3. `convex/league/` — 리그 배정/조회/주간 리셋
4. `convex/quizResult/mutation.ts` — `saveQuizResult` 확장 (isDaily, XP, streak)
5. `convex/crons.ts` — 데일리 생성 + 리그 리셋 스케줄링

### Frontend (React Native)
1. 홈 화면 리디자인 (컴포넌트 분리)
2. 데일리 퀴즈 플로우 (quiz.tsx 분기)
3. 공유카드 컴포넌트
4. 리그 화면

---

## 8. 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| 초기 리그 인원 부족 | 봇으로 30명 채움, 유저 증가 시 봇 비율 감소 |
| 공유카드 안 이쁘면 바이럴 실패 | MVP로 텍스트 공유 먼저, 이미지 카드는 반응 보고 개선 |
| 스트릭 부담감으로 이탈 | 스트릭 프리즈 + 데일리 5문제(2분)로 부담 최소화 |
| Cron 실패 시 데일리 없음 | 앱에서 데일리 없으면 온디맨드 생성 fallback |
