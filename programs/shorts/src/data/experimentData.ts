export type ExperimentOption = {
  text: string;
  isAnswer: boolean;
};

export type ExperimentUi = {
  timerPrompt?: string;
  demoTitle?: string;
  demoRevealTitle?: string;
};

type BaseExperimentShortProps = {
  id: string;
  title: string;
  hook: string;
  badge: string;
  reveal?: string;
  cta: string;
  bgmNumber?: number;
  source: string;
  ui?: ExperimentUi;
};

export type QuizExperimentShortProps = BaseExperimentShortProps & {
  kind: 'quiz';
  question: string;
  options: ExperimentOption[];
  answer: string;
  reveal: string;
};

export type DemoExperimentShortProps = BaseExperimentShortProps & {
  kind: 'demo';
  steps: string[];
  reveal: string;
};

export type ExperimentShortProps =
  | QuizExperimentShortProps
  | DemoExperimentShortProps;

const KOREAN_UI = {
  timerPrompt: '3초 안에 골라봐',
  demoTitle: '오늘의 상식 퀴즈',
  demoRevealTitle: '앱에서 바로 풀기',
};

export const EXPERIMENTS: ExperimentShortProps[] = [
  {
    id: 'ko-exp-01-korean-miss',
    title: '한국인도 많이 틀리는 상식 1문제',
    hook: '한국인도 은근히 틀리는 상식',
    badge: '1문제만',
    kind: 'quiz',
    question: '방을 옮기자마자 뭘 하려 했는지 까먹는 현상은?',
    options: [
      {text: '문 효과', isAnswer: true},
      {text: '터널 효과', isAnswer: false},
      {text: '플라시보 효과', isAnswer: false},
      {text: '베블런 효과', isAnswer: false},
    ],
    answer: '정답: 문 효과',
    reveal: '공간이 바뀌면 뇌가 작업 기억을 새로 정리해서 직전 의도를 놓치기 쉬워요.',
    cta: '이런 퀴즈 매일 5문제',
    bgmNumber: 8,
    source: 'shorts_ko_exp1',
    ui: KOREAN_UI,
  },
  {
    id: 'ko-exp-02-top-five',
    title: '10초 안에 맞히면 상위 5%',
    hook: '10초 안에 맞히면 상위 5%',
    badge: '타이머 챌린지',
    kind: 'quiz',
    question: '빅맥 지수는 무엇을 비교하려고 만든 지표일까?',
    options: [
      {text: '주식 시장', isAnswer: false},
      {text: '환율과 구매력', isAnswer: true},
      {text: '감자 가격', isAnswer: false},
      {text: '기업 복지', isAnswer: false},
    ],
    answer: '정답: 환율과 구매력',
    reveal: '같은 빅맥 가격을 나라별로 비교해서 통화 가치가 비싼지 싼지 봅니다.',
    cta: '오늘 두뇌 워밍업 끝',
    bgmNumber: 9,
    source: 'shorts_ko_exp2',
    ui: KOREAN_UI,
  },
  {
    id: 'ko-exp-03-app-demo',
    title: '이 앱으로 매일 상식 퀴즈 푸는 화면',
    hook: '하루 2분만 머리 깨우기',
    badge: '앱 데모',
    kind: 'demo',
    steps: ['매일 5문제', '오답 바로 복습', '스트릭 쌓기', '리그 순위 경쟁'],
    reveal: '출근길이나 자기 전, 짧게 풀고 바로 기억에 남게.',
    cta: 'Martie에서 오늘 퀴즈 풀기',
    bgmNumber: 10,
    source: 'shorts_ko_exp3',
    ui: KOREAN_UI,
  },
];

export const DEFAULT_EXPERIMENT = EXPERIMENTS[0];
