import {t} from '../STRINGS';

let lastIndex = 0;
const totalWelcomes = 50;

export const getRandomWelcome = (): string => {
  let nextIndex = Math.floor(Math.random() * totalWelcomes) + 1;

  // 같은 메시지가 연속으로 나오지 않도록 처리
  while (nextIndex === lastIndex) {
    nextIndex = Math.floor(Math.random() * totalWelcomes) + 1;
  }

  lastIndex = nextIndex;
  return t(`home.welcome${nextIndex}` as any);
};
