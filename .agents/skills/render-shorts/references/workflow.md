# 쇼츠 영상 렌더링

Martie 퀴즈 데이터를 기반으로 유튜브 쇼츠/릴스/틱톡용 세로 영상(1080x1920, ~49초)을 생성합니다.
**한 영상에 퀴즈 3개 + CTA**, **한/영/일 3개 언어 버전**을 동시에 생성합니다.

**⚠️ 중복 콘텐츠 억제 방지**: YouTube Shorts는 썸네일·제목·설명·업로드 시간이 반복되면 노출을 차단합니다. 이 스킬은 매 렌더마다 **템플릿·BGM·썸네일·해시태그·업로드 시각**을 모두 랜덤 풀에서 뽑아 다양화합니다. 어떤 경우에도 **고정 문구를 연속으로 재사용하지 않음**.

## 📊 데이터 기반 관찰 (2026-04-21~23 A/B 테스트 결과)

첫 3일치 배포 결과에서 얻은 교훈. 신규 렌더 시 반드시 반영:

| 일자 | 주제 조합 | ko | ja | en |
|---|---|---|---|---|
| Day 1 (4/21) | 가스라이팅 · 양자컴 · 노벨평화상 | **136** ✅ | **157** ✅ | 6 ⚠️ |
| Day 2 (4/22) | 금성역행 · DOMS · 영어단어 | **0** ❌ | **0** ❌ | **0** ❌ |
| Day 3 (4/23) | 달걀변성 · 재즈 · 국경 | **240** ✅ | TBD | TBD |

**확정된 교훈**

1. **Day 2 전체 채널 0회 → 크리에이티브 조합이 알고리즘에 찍힘**. 다음 요소 전부 동시 회피:
   - **주제**: "학술/암기/수치/건조한 사실" 계열 (우주 행성 특성, 의학 용어, 언어학 통계 등)
   - **BGM 7번** (3회 연속 0 관찰). 신규 렌더에서 **블랙리스트**, 4/29까지 금지.
   - **제목 "challenge" 템플릿** ("3문제 다 맞히면 상위 1%"처럼 "?"로 끝나지 않는 선언형). **삭제**.
   - **08:30 KST 이른 아침 공개** — 한국 채널 이 시각 0회. 회피.

2. **성공 주제 패턴**: 반전 (가스라이팅·달걀 변성·재즈 즉흥), 공감/관계 (심리·친구와 대결), 고유명사/트렌드 (노벨상·재즈), "어라 그런 거였어?" 모먼트.

3. **영어 채널은 억제가 아니라 저성능 베이스라인**. 영어 제목은 **반드시 고유명사/트렌드 앵커 포함** (인물·작품·브랜드·지역·연도). "Bet you didn't know this" 같은 모호한 문구 금지. 참고: 4/17 "Who Directed Parasite?" 49회 (영어 채널 베스트). 앵커 효과 강함.

4. **KO 제목은 반드시 "?" 로 끝낼 것**. 의문형이 선언형 대비 136 vs 0 차이 확인.

## 인자

- 인자 없음: 오늘 날짜 1일치 생성
- `--week`: 오늘부터 7일치(오늘~+6일) 일괄 생성. 각 날짜별로 서로 다른 퀴즈 3개씩 선택.
- `YYYYMMDD`: 특정 날짜 1일치 생성
- `YYYYMMDD --week`: 해당 날짜부터 7일치 일괄 생성

## 실행 순서 (1일치 기준, --week 시 날짜별 반복)

1. **history.json 읽기** (`programs/shorts/src/data/history.json`) — 객체 구조:
   ```json
   {
     "quizKeys": ["..."],
     "bgm": [{"date": "20260420", "n": 7}],
     "titleTemplate": [{"date": "20260420", "ids": {"ko": "shock", "en": "direct", "ja": "challenge"}}],
     "publishTime": [{"date": "20260420", "ko": "09:00", "en": "17:30", "ja": "18:00"}],
     "thumbnailVariant": [{"date": "20260420", "variants": {"ko": 2, "en": 4, "ja": 1}}]
   }
   ```
   누락 필드는 빈 배열로 초기화.

2. **새 퀴즈 선택**: `scripts/_seeds/` 에서 모든 퀴즈 파일을 읽고, `quizKeys` 에 없는 퀴즈 중 3개 랜덤 선택 (**카테고리가 겹치지 않도록**).

   **주제 선정 규칙 (4/22 데이터 기반)**:
   - ✅ 선호: **반전** (달걀 변성·재즈 즉흥 등 "어라?" 모먼트), **공감/관계** (심리·인간관계), **고유명사** (작품·인물·브랜드·지역 언급), **반직관적 사실** (가스라이팅 어원·양자 중첩), **생활 팁** (도마 냄새·응급처치)
   - ❌ 회피: **학술 암기** (행성 자전 방향·대기 구성비), **의학 용어** (DOMS·스테이프스), **언어학 통계** (어휘 수), **단순 수치** (%·km·km² 등), **건조한 역사 연대** (연도만 맞추기)
   - **3개 퀴즈 중 최소 2개는 선호군에서 선택**. 학술/암기형은 최대 1개까지.

3. **BGM 선택 (최근 7일 제외 + BGM 7 블랙리스트)**: `bgm` 배열에서 최근 7개 날짜의 `n` 값 추출 → 1~10 중 그 숫자들 제외하고 랜덤. **BGM 7 은 영구 블랙리스트** (2026-04-22 0회 관찰). 모두 제외되면 최근 3개만 제외 (단, BGM 7은 계속 제외 유지).

4. **썸네일 variant 선택 (최근 5일 제외 + 채널별 상이)**: `thumbnailVariant` 배열에서 최근 5일의 채널별 variant 확인 → ko/en/ja 각각 최근에 쓴 것 제외하고 1~5 중 랜덤. **같은 날 3개 언어는 서로 다른 variant 사용**.

5. **제목 템플릿 선택 (최근 4일 제외)**: 각 언어별로 최근 4일과 다른 템플릿 ID 선택. 풀은 아래 "제목 템플릿 풀" 섹션 참조.

6. **quizData.ts 업데이트**: 선택된 3개 퀴즈로 `SAMPLE_QUIZZES.quizzes` 배열 교체 + `bgmNumber` 설정. 각 퀴즈의 `hookText`는 **한 영상 내에서 3개 서로 다르게** 선택 (풀 아래 참조).

7. **한국어 영상 렌더링**:

```bash
cd programs/shorts
npx remotion render QuizShort out/quiz-ko-{YYYYMMDD}.mp4 --concurrency=1
```

(Chrome 경로가 자동 감지 실패 시 `--browser-executable` 추가. macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`)

8. **한국어 썸네일 렌더링** (선택된 ko variant 사용):

```bash
npx remotion still Thumbnail out/quiz-ko-{YYYYMMDD}.png --props='{"variant":2,"category":"세계사","hookText":"이거 모르면 한국인 아님","topEmoji":"🇰🇷"}' --concurrency=1
```

`category`/`hookText`/`topEmoji`는 3개 퀴즈 중 **가장 훅이 강한 1개** 기준으로 설정.

9. **영어 버전**: quizData.ts 영어 교체 → 영상 + 썸네일 (en variant)
10. **일본어 버전**: quizData.ts 일본어 교체 → 영상 + 썸네일 (ja variant)
11. **한국어 quizData.ts로 복원**
12. **history.json 업데이트**: 사용한 퀴즈 key 3개 + bgm n + 썸네일 variants + 제목 템플릿 ID + 업로드 예정 시각 전부 push (매 날짜 렌더링 완료 후 즉시)
13. **업로드용 제목/설명 파일 생성**: 각 영상과 같은 이름의 `.txt` (예: `quiz-ko-20260421.txt`). 제목/설명은 선택된 템플릿 ID 적용 + 해시태그 풀에서 **8개 랜덤**.
14. **사용자에게 결과 알림**: 영상/썸네일/텍스트 경로 전부 표시
15. **YouTube 업로드**: 사용자 확인 후 실행 (아래 참조)

## YouTube 업로드

`--week` 모드에서는 각 날짜별로 **채널마다 서로 다른 시각**으로 예약:

- 기본 범위: **KST 10:00 ~ 22:00** (08:00-09:30 금지 — 4/22 ko 08:30 0회 관찰)
- ko / en / ja 채널 각각 **최소 1시간 30분 간격** 으로 분산 (같은 시각 업로드 피함)
- 최근 4일간 사용한 시각(±30분 이내)은 제외 → `publishTime` 참조
- **sweet spot 관찰치**: ko 14:00 (136회), ko 09:15 (240회 — 09:00 이후 OK), ja 20:00 (157회). 이 시간대 근처 우선.

예시 (2026-04-22 배포):
- ko: KST 08:15 → UTC `2026-04-21T23:15:00Z`
- en: KST 13:45 → UTC `2026-04-22T04:45:00Z`
- ja: KST 19:30 → UTC `2026-04-22T10:30:00Z`

업로드 명령:

```bash
cd programs/shorts
bun run scripts/upload-all.ts 20260422 --schedules 2026-04-21T23:15:00Z,2026-04-22T04:45:00Z,2026-04-22T10:30:00Z
```

`--schedules` 는 ko,en,ja 순서의 3개 ISO 타임스탬프. 같은 이름의 `.png` 썸네일이 있으면 자동 적용됨.

## 업로드 취소

예약된 영상 취소:

```bash
bun run scripts/cancel-scheduled.ts 20260422              # dry-run (목록만)
bun run scripts/cancel-scheduled.ts 20260422 --confirm    # 실제 삭제
```

---

## 제목 템플릿 풀

매일 최근 4일과 다른 ID를 선택. `{hook}` / `{category}` 플레이스홀더 사용.

### 한국어 (ko)

**필수**: 제목은 반드시 `?` 로 끝내야 함. 선언형 (`👑`로 끝나는 자랑형 등) 금지 — 4/22 실측 0회.

| id | 템플릿 |
|----|--------|
| `shock` | `"{hook} 😱 #퀴즈 #상식퀴즈 #shorts"` |
| `korean-check` | `"이거 모르면 한국인 아님?! 🇰🇷 #상식퀴즈 #shorts"` |
| `direct` | `"{category} 퀴즈 - 너 몇 개 맞힐래? 🧠 #퀴즈 #shorts"` |
| `genius` | `"{hook} 정답 알면 천재? 🧠 #상식테스트 #shorts"` |
| `iq-test` | `"IQ 130 이상만 맞혔다? {hook} #두뇌테스트 #shorts"` |
| `meaning` | `"{keyword} 진짜 뜻 아냐? 🤔 #퀴즈 #shorts"` |
| `secret` | `"{category} 진짜 비밀은? 🔥 #상식 #shorts"` |

~~`challenge`~~ (3문제 다 맞히면 상위 1% 👑) — **deprecated, 4/22 ko 0회 관찰**

### 영어 (en)

**필수**: 영어 제목은 반드시 **고유명사/트렌드 앵커** 포함 (인물·작품·브랜드·지역·연도·사건). 모호한 일반 문구 금지 — "Bet you didn't know this" 같은 것 4/21 en 6회로 사실상 실패. 4/17 "Who Directed Parasite?" 는 49회 (영화 고유명사 앵커 효과).

| id | 템플릿 |
|----|--------|
| `named-question` | `"Why {properNoun}? {subtopic} Explained #quiz #shorts"` |
| `mystery` | `"The {properNoun} Mystery 🤔 #quiz #shorts"` |
| `direct` | `"{category} Quiz - How Many Can You Get? 🧠 #shorts"` |
| `genius` | `"Only a Genius Knows {properNoun} 🧠 #shorts"` |
| `iq-test` | `"IQ 130+ Only: {specificQuestion}? #quiz #shorts"` |
| `fast` | `"Answer in 5 Seconds ⏱️ {properNoun} #shorts"` |
| `decade` | `"{year}'s {topic} Facts #quiz #shorts"` |

예시 훅 제목:
- ✅ "Why Oslo? Nobel Peace Prize Mystery #quiz #shorts"
- ✅ "The GPT Secret: What P Really Means #shorts"
- ✅ "Einstein vs Newton: Who Was Right? #shorts"
- ❌ "Bet you didn't know this" (앵커 없음)
- ❌ "Only top 1% get all 3 right" (선언형, 구체성 없음)

### 일본어 (ja)

**필수**: 제목은 `?` (`？`) 또는 `！` 로 끝낼 것. `challenge` 선언형 deprecated.

| id | 템플릿 |
|----|--------|
| `shock` | `"{hook} 😱 #クイズ #雑学 #shorts"` |
| `did-you-know` | `"これ知ってた？ 🤯 #豆知識 #shorts"` |
| `direct` | `"{category}クイズ 何問正解できる？🧠 #shorts"` |
| `genius` | `"正解したら頭いい？🧠 #脳トレ #shorts"` |
| `iq-test` | `"IQ130以上だけ正解？{hook} #クイズ #shorts"` |
| `fast` | `"5秒で答えて ⏱️ {hook} #shorts"` |
| `mystery` | `"{properNoun}の本当の意味は？🤔 #shorts"` |

~~`challenge`~~ (3問全問正解で天才認定 👑) — **deprecated, 선언형 4/22 ja 0회 관찰**

## 설명 템플릿 풀

3개 중 하나 랜덤 (titleTemplate과 연동 X, 독립 랜덤). Q1/Q2/Q3 요약과 CTA는 공통.

### 한국어

- **T1 (도전형)**: 첫 줄 `"3문제 다 맞히면 상위 1% 👑"`
- **T2 (친구 공유형)**: 첫 줄 `"친구한테 보내서 누가 잘 아는지 대결! 🧠"`
- **T3 (학습형)**: 첫 줄 `"오늘의 상식 3문제 - 너 다 알아? 📚"`

### 영어

- **T1**: `"Only the top 1% can get all 3 right 👑"`
- **T2**: `"Share with friends and see who's smarter 🧠"`
- **T3**: `"Today's 3 fun facts - how many did you know? 📚"`

### 일본어

- **T1**: `"3問全問正解できたら上位1% 👑"`
- **T2**: `"友達とシェアして勝負しよう 🧠"`
- **T3**: `"今日の雑学3問 - 全部知ってた？📚"`

공통 뒷부분 (모든 언어 공통 구조):
```
Q1. {질문1 요약}
Q2. {질문2 요약}
Q3. {질문3 요약}

{정답 안내 문구} 👀

📲 {앱 홍보 문구}
🍎 iOS: https://apps.apple.com/app/id6740057833
🤖 Android: https://play.google.com/store/apps/details?id=dev.hyo.martie

{해시태그 8개 — 아래 해시태그 풀 참조}
```

## 해시태그 풀 (언어별 20개 → 8개 랜덤)

### 한국어

`#퀴즈` `#상식퀴즈` `#일반상식` `#shorts` `#마티` `#Martie` `#퀴즈챌린지` `#두뇌테스트` `#상식테스트` `#IQ테스트` `#퀴즈놀이` `#잡학상식` `#알쓸신잡` `#퀴즈스타그램` `#일상퀴즈` `#공부스타그램` `#지식충전` `#재미있는상식` `#뇌운동` `#학습쇼츠`

**필수 포함**: `#shorts` 1개만 고정. 나머지 7개 랜덤. `#마티` 는 2일 연속 사용 금지.

### 영어

`#quiz` `#trivia` `#shorts` `#Martie` `#generalknowledge` `#didyouknow` `#braintest` `#quizchallenge` `#iqtest` `#learn` `#funfacts` `#smartquiz` `#triviaquestions` `#knowledge` `#studyshorts` `#learnsomething` `#quizgame` `#brainteaser` `#factsdaily` `#edutok`

**필수 포함**: `#shorts` 1개만 고정. 나머지 7개 랜덤.

### 일본어

`#クイズ` `#雑学` `#shorts` `#Martie` `#一般常識` `#豆知識` `#脳トレ` `#クイズチャレンジ` `#IQテスト` `#勉強` `#知識` `#クイズ好きな人と繋がりたい` `#頭の体操` `#学び` `#毎日クイズ` `#雑学クイズ` `#教養` `#知って得する` `#知識欲` `#ためになる`

**필수 포함**: `#shorts` 1개만 고정. 나머지 7개 랜덤.

## 다국어 변환 규칙

### hookText 풀 (한 영상 내 3개 서로 다르게)

**ko**: `"이거 맞히면 천재 🧠"`, `"5초 안에 맞혀봐! ⏱️"`, `"상위 1%만 맞힌다 👑"`, `"이건 진짜 어렵다 🔥"`, `"친구한테 공유해봐 💬"`, `"몇 개 맞출 수 있을까? 🤔"`, `"너 이거 알아? 🫣"`, `"초등학생도 아는데 🙄"`, `"어른이 더 헷갈림 😵"`

**en**: `"Can you get this right? 🧠"`, `"Answer in 5 seconds! ⏱️"`, `"Only top 1% know this 👑"`, `"This one's tough 🔥"`, `"Share with friends 💬"`, `"How many can you get? 🤔"`, `"Did you know this? 🫣"`, `"Kids know this 🙄"`, `"Adults get stumped 😵"`

**ja**: `"これ正解できる？🧠"`, `"5秒以内に答えて！⏱️"`, `"上位1%だけ正解 👑"`, `"これは難しい 🔥"`, `"友達にシェアしよう 💬"`, `"何問正解できる？🤔"`, `"これ知ってた？🫣"`, `"子供でも知ってる 🙄"`, `"大人の方が間違える 😵"`

### 기타 텍스트

- **ctaText**: ko=`"매일 퀴즈 도전하기"`, en=`"Daily Quiz Challenge"`, ja=`"毎日クイズに挑戦"`
- **correctText**: ko=`"정답! ✅"`, en=`"Correct! ✅"`, ja=`"正解！✅"`
- **countdownText**: ko=`"정답은...? 🤔"`, en=`"The answer is...? 🤔"`, ja=`"答えは...？🤔"`
- **downloadText**: ko=`"Martie 다운로드 →"`, en=`"Download Martie →"`, ja=`"Martieをダウンロード →"`

## 영상 구성 (~49초, 퀴즈 3개 + CTA)

각 퀴즈 (15초):
- 0-2초: Q번호 + 훅 텍스트 + 마티 로고 + 카테고리
- 2-10초: 문제 + 4지선다 (7-10초에 카운트다운 오버레이)
- 10-15초: 정답 하이라이트 + 해설 (5초)

마지막 CTA (4초): 마티 로고 + 워드마크 + 다운로드 버튼

BGM: 최근 7일 제외한 랜덤 (bgm-01 ~ bgm-10), 효과음: swoosh, tick x3, correct

## 썸네일 구성 (5 variants)

`src/Thumbnail.tsx`의 5개 레이아웃 — 같은 날 3개 채널은 **서로 다른 variant**, 최근 5일과도 다른 것으로.

- **V1**: 빨간 배경 + 큰 이모지 상단 + 노란 카테고리 칩
- **V2**: 크림 배경 + 카테고리 칩 상단 + 이모지 중앙 + "정답은?" 배지
- **V3**: 상하 2분할 (네이비/노랑) + "Q." 큰 텍스트 + 이모지
- **V4**: 그라데이션 + "상위 1%만" + 숫자 "3" 강조
- **V5**: 크림 배경 + 로고 + 초록 카테고리 배지 + A/B/C/D 옵션 시각화

`topEmoji`는 퀴즈 카테고리 기반:
- 세계사/World History → 🏛️ 🗡️ 📜
- 과학/Science → 🧪 🔬 🧬
- 테크/Tech → 🤖 💻 📱
- 우주/Space → 🚀 🌌 🪐
- 자연/Nature → 🌿 🐾 🌊
- 지리/Geography → 🌍 🗺️ 🏔️
- 건강/Health → 💪 🥗 ❤️
- 기타 → 💡 🤔 🔥 👑 🧠

## 퀴즈 데이터 형식

`scripts/_seeds/` 퀴즈에서 가져올 때 변환:
- `categoryName` → `category` (한글로 변환)
- `description` → `question`
- `options[].description` → `options[].text`
- `options[].isAnswer` → 그대로
- `answerDescription` → `explanation`

## 카테고리 매핑

| EN | KO | JA |
|----|----|----|
| General Knowledge | 일반상식 | 一般常識 |
| Science | 과학 | 科学 |
| World History | 세계사 | 世界史 |
| Geography | 지리문화 | 地理文化 |
| Law | 법과권리 | 法と権利 |
| Economy | 경제 | 経済 |
| Health | 건강 | 健康 |
| Tech | 테크 | テック |
| Cooking | 요리 | 料理 |
| Space | 우주 | 宇宙 |
| Nature | 자연 | 自然 |
| Art & Music | 예술 | 芸術 |
| Sports | 스포츠 | スポーツ |
| Pop Culture | 팝컬쳐 | ポップカルチャー |
| Psychology | 심리 | 心理 |
| Environment | 환경 | 環境 |
| First Aid | 응급처치 | 応急処置 |
| Life Hacks | 생활팁 | 生活の知恵 |
| Digital | 디지털 | デジタル |
| Language | 언어 | 言語 |

## categoryName → EN 매핑

| categoryName (seed) | EN |
|-----|-----|
| GENERAL_KNOWLEDGE | General Knowledge |
| BASIC_SCIENCE | Science |
| WORLD_HISTORY | World History |
| GEOGRAPHY_AND_CULTURE | Geography |
| LAW_AND_RIGHTS | Law |
| ECONOMY_AND_FINANCE | Economy |
| HEALTH_AND_NUTRITION | Health |
| TECHNOLOGY_AND_AI | Tech |
| FOOD_AND_COOKING | Cooking |
| SPACE_AND_ASTRONOMY | Space |
| ANIMALS_AND_NATURE | Nature |
| ART_AND_MUSIC | Art & Music |
| SPORTS | Sports |
| POP_CULTURE | Pop Culture |
| PSYCHOLOGY | Psychology |
| ENVIRONMENT_AND_CLIMATE | Environment |
| FIRST_AID_AND_SAFETY | First Aid |
| LIFE_HACKS | Life Hacks |
| DIGITAL_LITERACY | Digital |
| LANGUAGE_AND_COMMUNICATION | Language |
