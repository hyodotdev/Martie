// scripts/quizExtractor.ts

import {promises as fs} from 'fs';
import {basicQuizzes} from './_seeds/20250307_quiz';
import path from 'path';

type Quiz = (typeof basicQuizzes)[0];

function extractDescriptions(quizzes: Quiz[]): string[] {
  return quizzes.map((quiz) => quiz.description);
}

async function appendToHistory(
  descriptions: string[],
  filePath: string = 'quizzesHistory.md',
): Promise<void> {
  try {
    const header = '# Quiz Questions History\n\n';
    let existingContent = '';

    // 기존 파일 읽기
    try {
      existingContent = await fs.readFile(filePath, 'utf8');
    } catch (e) {
      console.log('File not found, creating a new one:', e);
    }

    // 새로운 질문에 '-' 접두사 추가
    const content = descriptions.map((desc) => `- ${desc}`).join('\n');

    // 기존 내용에서 '-'로 시작하는 줄 추출 (중복 체크용)
    const existingLines = existingContent
      .split('\n')
      .filter((line) => line.match(/^-\s/))
      .map((line) => line.replace(/^-\s*/, '').trim()); // '-' 제거 후 내용만 비교

    const newLines = content.split('\n');
    const uniqueNewLines = newLines.filter((line) => {
      const newDesc = line.replace(/^-\s*/, '').trim();
      return !existingLines.includes(newDesc);
    });

    const updatedContent = existingContent
      ? `${existingContent}\n${uniqueNewLines.join('\n')}\n`
      : `${header}${content}\n`;

    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(
      `Descriptions appended to ${filePath}. Added ${uniqueNewLines.length} new questions.`,
    );
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}

// 경로 설정 (고정)
const DATA_DIR = './data';
const LOCALES_DIR = './locales';

// 지원하는 언어 목록
const LANGUAGES = ['ko', 'en', 'ja'] as const;
type Language = (typeof LANGUAGES)[number];

// 디렉토리가 존재하는지 확인하고 없으면 생성하는 헬퍼 함수
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, {recursive: true});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// JSON 파일을 읽는 헬퍼 함수
async function readJsonFile(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as Record<string, string>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}; // 파일이 없으면 빈 객체 반환
    }
    throw error;
  }
}

// JSON 파일을 쓰는 헬퍼 함수
async function writeJsonFile(
  filePath: string,
  data: Record<string, string>,
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 특정 언어의 퀴즈 데이터를 백업하는 함수
async function backupQuizLanguage(language: Language): Promise<void> {
  const sourceFile = path.join(DATA_DIR, `${language}.json`);
  const targetFile = path.join(LOCALES_DIR, `${language}.json`);

  try {
    // 소스 데이터 읽기 (data/[language].json)
    const sourceData = await readJsonFile(sourceFile);
    if (Object.keys(sourceData).length === 0) {
      console.log(
        `No data found in ${sourceFile}. Skipping backup for ${language}.`,
      );
      return;
    }

    // 타겟 데이터 읽기 (locales/[language].json)
    await ensureDirectoryExists(LOCALES_DIR); // locales 디렉토리 확인 및 생성
    const targetData = await readJsonFile(targetFile);

    // 데이터 병합 (기존 데이터 유지, 새로운 데이터 추가/업데이트)
    const updatedData = {...targetData, ...sourceData};

    // 병합된 데이터 저장
    await writeJsonFile(targetFile, updatedData);

    console.log(
      `Successfully backed up quiz languages from ${sourceFile} to ${targetFile}. Total keys: ${Object.keys(updatedData).length}`,
    );
  } catch (error) {
    console.error(`Failed to backup quiz languages for ${language}:`, error);
    throw error;
  }
}

// 모든 언어의 퀴즈 데이터를 백업하는 함수
export async function backupQuizLanguages(): Promise<void> {
  try {
    // 모든 언어에 대해 순차적으로 백업 실행
    for (const language of LANGUAGES) {
      await backupQuizLanguage(language);
    }
    console.log('All quiz languages backed up successfully.');
  } catch (error) {
    console.error('Failed to backup all quiz languages:', error);
    throw error;
  }
}

async function main() {
  const descriptions = extractDescriptions(basicQuizzes);

  descriptions.forEach((desc, index) => {
    console.log(`${index + 1}. ${desc}`);
  });

  // await appendToHistory(descriptions);
  await backupQuizLanguages();
}

main().catch((error) => console.error('Main execution failed:', error));

export {extractDescriptions, appendToHistory};
