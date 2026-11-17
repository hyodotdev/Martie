export type QuizOption = {
  text: string;
  isAnswer: boolean;
};

export type QuizItem = {
  hookText: string;
  category: string;
  question: string;
  options: QuizOption[];
  explanation: string;
};

export type MultiQuizProps = {
  quizzes: QuizItem[];
  ctaText: string;
  bgmNumber?: number; // 1-10, random BGM selection
  correctText?: string; // "정답! ✅" / "Correct! ✅" / "正解！✅"
  countdownText?: string; // "정답은...? 🤔" / "The answer is...? 🤔" / "答えは...？🤔"
  downloadText?: string; // "지금 다운로드 →" / "Download Martie →" / "Martieをダウンロード →"
};

export const SAMPLE_QUIZZES: MultiQuizProps = {
  "ctaText": "매일 퀴즈 도전하기",
  "correctText": "정답! ✅",
  "countdownText": "정답은...? 🤔",
  "downloadText": "Martie 다운로드 →",
  "bgmNumber": 8,
  "quizzes": [
    {
      "hookText": "어른이 더 헷갈림 😵",
      "category": "심리",
      "question": "방을 옮기면 무엇을 하려 했는지 잊는 현상을 가리키는 심리학 용어는?",
      "options": [
        {
          "text": "문(門) 효과",
          "isAnswer": true
        },
        {
          "text": "터널 효과",
          "isAnswer": false
        },
        {
          "text": "플라시보 효과",
          "isAnswer": false
        },
        {
          "text": "베블런 효과",
          "isAnswer": false
        }
      ],
      "explanation": "\"문(門) 효과(Doorway Effect)\"는 환경이 달라지면 작업 기억이 갱신되어 직전 의도를 잠시 잃는 현상이에요!"
    },
    {
      "hookText": "너 이거 알아? 🫣",
      "category": "경제",
      "question": "영국 이코노미스트지가 빅맥 가격을 활용해 환율을 비교하는 지수의 이름은?",
      "options": [
        {
          "text": "닥터 마틴 지수",
          "isAnswer": false
        },
        {
          "text": "빅맥 지수",
          "isAnswer": true
        },
        {
          "text": "스타벅스 지수",
          "isAnswer": false
        },
        {
          "text": "나이키 지수",
          "isAnswer": false
        }
      ],
      "explanation": "빅맥 지수는 1986년 이코노미스트지가 만든 지표로, 같은 빅맥 가격을 비교해 통화의 구매력 평가를 가늠하는 데 쓰여요!"
    },
    {
      "hookText": "5초 안에 맞혀봐! ⏱️",
      "category": "예술",
      "question": "바티칸 시스티나 성당의 천장화 \"천지 창조\"를 그린 화가는?",
      "options": [
        {
          "text": "레오나르도 다빈치",
          "isAnswer": false
        },
        {
          "text": "미켈란젤로",
          "isAnswer": true
        },
        {
          "text": "라파엘로",
          "isAnswer": false
        },
        {
          "text": "카라바조",
          "isAnswer": false
        }
      ],
      "explanation": "미켈란젤로는 1508~1512년 시스티나 성당 천장에 누워서 천장화를 완성했어요. \"아담의 창조\" 장면으로 특히 유명하답니다!"
    }
  ]
};
