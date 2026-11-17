// generateQuizFile.js
import fs from 'fs/promises';
import path from 'path';
import {URL} from 'url';
import {quizzes} from './inputs.mjs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const CURRENT_DATE = '20250307';
const fileName = `${CURRENT_DATE}_quiz.ts`;
const filePath = path.join(__dirname, './data', fileName);
const koJsonPath = path.join(__dirname, './data', `ko.json`);

export const sampleQuizzes = quizzes;

const convertToQuizData = (data) => {
  return data.map((quiz, index) => {
    const quizIndex = (index + 1).toString().padStart(4, '0');
    const quizPrefix = `${CURRENT_DATE}_${quizIndex}`;

    // Validate quiz structure
    if (!quiz || typeof quiz !== 'object') {
      throw new Error('Invalid quiz data: quiz must be an object');
    }

    // Ensure options exists and is an array
    if (!Array.isArray(quiz.options)) {
      console.log(quiz);
      throw new Error('Invalid quiz data: options must be an array');
    }

    return {
      categoryName: quiz.categoryName,
      level: quiz.level,
      key: `${quizPrefix}_key`,
      description: quiz.description,
      answerKey: `${quizPrefix}_answer`,
      answerDescription: quiz.answerDescription,
      indexes: quiz.indexes,
      options: quiz.options.map((opt, optIndex) => ({
        key: `${quizPrefix}_opt${optIndex + 1}`,
        description: opt.description,
        isAnswer: opt.isAnswer || false,
      })),
    };
  });
};

const quizData = convertToQuizData(sampleQuizzes);

const fileContent = `
export const basicQuizzes = ${JSON.stringify(quizData, null, 2)};

export default basicQuizzes;`;

fs.mkdir(path.join(__dirname, './data'), {recursive: true});
fs.writeFile(filePath, fileContent, 'utf8');
console.log(`✅ ${fileName} 파일이 생성되었습니다.`);

const generateLangJson = (langPath) => {
  const langJson = {};
  quizData.forEach((quiz) => {
    langJson[quiz.key] = quiz.description;
    langJson[quiz.answerKey] = quiz.answerDescription;
    quiz.options.forEach((option) => {
      langJson[option.key] = option.description;
    });
  });
  fs.writeFile(langPath, JSON.stringify(langJson, null, 2), 'utf8');
  console.log(`✅ ${path.basename(langPath)} 파일이 생성되었습니다.`);
};

generateLangJson(koJsonPath);
