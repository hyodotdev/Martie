# 퀴즈 생성 프롬프트 1

<!-- quizzes/*.md 파일에 있는 리스트를 주면서 아래와 같이 프롬프트 -->

Level은 난이도 별로 1~30 사이로 설정되어 있는데 현재 만드는 난이도는 1~3 레벨의 퀴즈를 만들어줘.
퀴즈는 사실 위주로 작성해주고, 주로 앞으로 일어날 일들보다는 과거와 현재의 보편적인 사실 기반으로 생성해줘. 단, 단순히 특정 이벤트의 연도를 묻는 문제는 피하고, 실생활에서 유익하거나 기초 상식을 넓히는 데 도움이 되는 내용으로 만들어줘.
문제를 생성할 때는 주관적인 내용은 절대 넣지 말아줘.
질문은 모두 존대말로 만들어줘.
교유한 문제로 해주고 유사한 문제도 필요없어.
새로운 주제의 퀴즈를 최대한 잘 만들어줘.
"공공장소", "대한민국" 용어가 최대한 안들어가게 해주고, LAW_AND_RIGHTS 카테고리 문제는 국제적인 것으로 다뤄줘.
꼭 중복이나 유사한 문제는 피해주고 넓은 범위로 퀴즈를 만들어줘.
질문 형식은 단조롭지 않게 다양하게 제공해줘.

<!-- 지속적으로 질문 중복에 대한 확인을 하면서 생성하기 -->

> 다음 퀴즈 생성을 위해서 위에서 나온 데이터를 `quizzes/*.md` 파일에 추가. 아래부터 새로운 프롬프트 작업.

# 퀴즈 데이터 생성 프롬프트 2

<!-- 만들어진 퀴즈 리스트를 가지고 아래와 같은 형태로 만들어달라고 Grok에 요청. 아래까지 쭉 복사 붙여넣기 해도 됨. -->

`const quizzes = []` 배열 안에 들어갈 퀴즈들을 만들어줘.
카테고리별로 1개씩 15개 세트의 질문 생성해주면 되고 아래 (#퀴즈 데이터) 예시 참고해주고 그렇게 계속 이어서 만들어주면 돼. 만들어진 퀴즈를 질문으로 해주고 아래 필요한 데이터들은 추가해줘.

150개의 항목을 10개씩 그룹화하여 총 15개의 세트로 만들고, 이 모든 세트를 하나의 배열에 담아줘.
`answerDescription` 답변 해설은 구체적이고 유익한 내용을 알려줘.
답변은 모두 존대말로 만들어주고 답변 해설 말투는 "~입니다" 보다 "~이에요", "~랍니다", "~라고 해요!" 등 부드러운 말투로 해줘.
key는 {오늘날짜}\_0001_key부터 순차적으로 증가해야해. 예) 20250225_0001_key

## 카테고리

- BASIC_SCIENCE: 기초 과학
- DIGITAL_LITERACY: 디지털 리터러시
- ECONOMY_AND_FINANCE: 경제·금융
- FIRST_AID_AND_SAFETY: 응급처치·생활 안전
- GENERAL_KNOWLEDGE: 일반 상식
- GEOGRAPHY_AND_CULTURE: 지리·세계 문화
- LAW_AND_RIGHTS: 법·권리
- LIFE_HACKS: 생활 꿀팁
- POP_CULTURE: 대중문화 상식
- WORLD_HISTORY: 세계사

## 퀴즈 데이터 예시

```ts
export const quizzes = [
  // GENERAL_KNOWLEDGE
  {
    categoryName: 'GENERAL_KNOWLEDGE',
    level: 2,
    key: '20250224_0002_key',
    description: '세계에서 가장 높은 산은 무엇일까요?',
    answerKey: '20250224_0002_answer',
    answerDescription: '에베레스트는 약 8,848m로 세계에서 가장 높은 산이에요!',
    indexes: ['산', '가장 높은'],
    options: [
      {key: '20250224_0002_opt1', description: '킬리만자로', isAnswer: false},
      {key: '20250224_0002_opt2', description: '에베레스트', isAnswer: true},
      {key: '20250224_0002_opt3', description: '알프스', isAnswer: false},
      {key: '20250224_0002_opt4', description: '안나푸르나', isAnswer: false},
    ],
  },

  // BASIC_SCIENCE
  {
    categoryName: 'BASIC_SCIENCE',
    level: 1,
    key: '20250224_0051_key',
    description: '인간의 뼈는 몇 개일까요?',
    answerKey: '20250224_0051_answer',
    answerDescription: '성인의 뼈는 206개로 이루어져 있어요.',
    indexes: ['뼈', '개수'],
    options: [
      {key: '20250224_0051_opt1', description: '180개', isAnswer: false},
      {key: '20250224_0051_opt2', description: '206개', isAnswer: true},
      {key: '20250224_0051_opt3', description: '250개', isAnswer: false},
      {key: '20250224_0051_opt4', description: '300개', isAnswer: false},
    ],
  },

  // WORLD_HISTORY
  {
    categoryName: 'WORLD_HISTORY',
    level: 1,
    key: '20250224_0101_key',
    description: '프랑스 혁명이 시작된 해는 언제일까요?',
    answerKey: '20250224_0101_answer',
    answerDescription: '프랑스 혁명은 1789년에 시작된 역사적인 사건이에요!',
    indexes: ['프랑스', '혁명'],
    options: [
      {key: '20250224_0101_opt1', description: '1750년', isAnswer: false},
      {key: '20250224_0101_opt2', description: '1789년', isAnswer: true},
      {key: '20250224_0101_opt3', description: '1800년', isAnswer: false},
      {key: '20250224_0101_opt4', description: '1820년', isAnswer: false},
    ],
  },

  // GEOGRAPHY_AND_CULTURE
  {
    categoryName: 'GEOGRAPHY_AND_CULTURE',
    level: 1,
    key: '20250224_0151_key',
    description: '일본의 수도는 어디일까요?',
    answerKey: '20250224_0151_answer',
    answerDescription: '도쿄는 일본의 수도로 활기찬 도시랍니다.',
    indexes: ['일본', '수도'],
    options: [
      {key: '20250224_0151_opt1', description: '오사카', isAnswer: false},
      {key: '20250224_0151_opt2', description: '도쿄', isAnswer: true},
      {key: '20250224_0151_opt3', description: '교토', isAnswer: false},
      {key: '20250224_0151_opt4', description: '삿포로', isAnswer: false},
    ],
  },

  // LAW_AND_RIGHTS
  {
    ,
    categoryName: 'LAW_AND_RIGHTS',
    level: 1,
    key: '20250224_0201_key',
    description: '대한민국에서 투표할 수 있는 나이는 몇 살일까요?',
    answerKey: '20250224_0201_answer',
    answerDescription: '만 19세부터 투표를 할 수 있는 권리가 생겨요!',
    indexes: ['투표', '나이'],
    options: [
      {key: '20250224_0201_opt1', description: '16세', isAnswer: false},
      {key: '20250224_0201_opt2', description: '19세', isAnswer: true},
      {key: '20250224_0201_opt3', description: '18세', isAnswer: false},
      {key: '20250224_0201_opt4', description: '21세', isAnswer: false},
    ],
  },

  // ECONOMY_AND_FINANCE
  {
    ,
    categoryName: 'ECONOMY_AND_FINANCE',
    level: 1,
    key: '20250224_0301_key',
    description: '돈의 기본 기능 중 하나는 무엇일까요?',
    answerKey: '20250224_0301_answer',
    answerDescription: '돈은 물건을 사고팔 때 쓰이는 교환의 매개체예요.',
    indexes: ['돈', '기능'],
    options: [
      {key: '20250224_0301_opt1', description: '장식', isAnswer: false},
      {key: '20250224_0301_opt2', description: '교환의 매개체', isAnswer: true},
      {key: '20250224_0301_opt3', description: '기념품', isAnswer: false},
      {key: '20250224_0301_opt4', description: '보석', isAnswer: false},
    ],
  },

  // FIRST_AID_AND_SAFETY
  {
    categoryName: 'FIRST_AID_AND_SAFETY',
    level: 1,
    key: '20250224_0351_key',
    description: '출혈을 멈추기 위해 가장 먼저 해야 할 일은 무엇일까요?',
    answerKey: '20250224_0351_answer',
    answerDescription: '상처를 살짝 누르면 출혈이 줄어든답니다!',
    indexes: ['출혈', '응급'],
    options: [
      {key: '20250224_0351_opt1', description: '물로 씻기', isAnswer: false},
      {key: '20250224_0351_opt2', description: '상처 압박', isAnswer: true},
      {key: '20250224_0351_opt3', description: '연고 바르기', isAnswer: false},
      {
        key: '20250224_0351_opt4',
        description: '붕대 바로 감기',
        isAnswer: false,
      },
    ],
  },

  // LIFE_HACKS
  {
    categoryName: 'LIFE_HACKS',
    level: 1,
    key: '20250224_0401_key',
    description: '얼룩을 쉽게 지우는 방법은 무엇일까요?',
    answerKey: '20250224_0401_answer',
    answerDescription: '식초와 물을 섞어서 문지르면 얼룩이 쏙 지워져요.',
    indexes: ['얼룩', '제거'],
    options: [
      {key: '20250224_0401_opt1', description: '기름 바르기', isAnswer: false},
      {key: '20250224_0401_opt2', description: '식초와 물', isAnswer: true},
      {key: '20250224_0401_opt3', description: '뜨거운 물', isAnswer: false},
      {key: '20250224_0401_opt4', description: '소금 뿌리기', isAnswer: false},
    ],
  },

  // DIGITAL_LITERACY
  {
    categoryName: 'DIGITAL_LITERACY',
    level: 1,
    key: '20250224_0451_key',
    description: '이메일에서 "CC"는 무엇을 뜻할까요?',
    answerKey: '20250224_0451_answer',
    answerDescription: 'CC는 Carbon Copy의 약자로, 이메일에서 참조를 뜻해요!',
    indexes: ['이메일', 'CC'],
    options: [
      {key: '20250224_0451_opt1', description: 'Close Call', isAnswer: false},
      {key: '20250224_0451_opt2', description: 'Carbon Copy', isAnswer: true},
      {key: '20250224_0451_opt3', description: 'Copy Content', isAnswer: false},
      {key: '20250224_0451_opt4', description: 'Clear Cache', isAnswer: false},
    ],
  },

  // POP_CULTURE
  {
    categoryName: 'POP_CULTURE',
    level: 1,
    key: '20250224_0511_key',
    description: '해리 포터 시리즈의 저자는 누구이신가요?',
    answerKey: '20250224_0511_answer',
    answerDescription: 'J.K. 롤링은 해리 포터 시리즈를 쓴 유명한 작가예요!'
    indexes: ['해리 포터', '저자'],
    options: [
      {key: '20250224_0511_opt1', description: '스티븐 킹', isAnswer: false},
      {key: '20250224_0511_opt2', description: 'J.K. 롤링', isAnswer: true},
      {
        key: '20250224_0511_opt3',
        description: '조지 R.R. 마틴',
        isAnswer: false,
      },
      {key: '20250224_0511_opt4', description: 'J.R.R. 톨킨', isAnswer: false},
    ],
  },
];
```

150개 퀴즈를 한번에 만들어줘.
그리고 오늘 날짜를 20250301이라고 가정하고 만들어줘.
