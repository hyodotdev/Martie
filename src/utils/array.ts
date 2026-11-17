/**
 * Fisher-Yates 알고리즘을 사용하여 배열을 랜덤하게 섞습니다
 */
export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}
