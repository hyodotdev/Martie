/// <reference types="node" />
import type {Config} from '@jest/types';

process.env.TZ = 'Asia/Seoul';

export default async (): Promise<Config.InitialOptions> => {
  return {
    // https://github.com/jefflau/jest-fetch-mock#to-setup-for-all-tests
    automock: false,
    resetMocks: false,
    preset: 'jest-expo',
    transform: {
      '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    },
    transformIgnorePatterns: [
      // Transform ESM in selected node_modules (e.g., immer, zustand middleware)
      'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|standard-navigation|@unimodules/.*|unimodules|native-base|react-native-svg|cpk-ui|@cpk-ui|immer|zustand|uuid|@codemagic/react-native-patch|nitro-core|react-native-nitro-modules|react-native-mmkv|@shopify/flash-list)',
    ],
    modulePaths: ['<rootDir>'],
    moduleDirectories: ['node_modules'],
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    moduleFileExtensions: ['js', 'ts', 'tsx', 'svg', 'png', 'json'],
    modulePathIgnorePatterns: [
      '<rootDir>/build/',
      '<rootDir>/node_modules/',
      '<rootDir>/.history/',
    ],
    moduleNameMapper: {
      '\\.svg': '<rootDir>/__mocks__/svgMock.js',
      '.+\\.(css|style|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'babel-jest',
      '^convex/react$': '<rootDir>/__mocks__/convex/react.ts',
      '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.js',
      '^react-native-reanimated$':
        '<rootDir>/__mocks__/react-native-reanimated.js',
    },
    setupFiles: [
      '<rootDir>/test/testSetup.ts',
      './node_modules/react-native-gesture-handler/jestSetup.js',
      // Fakes the Patch TurboModule: a store binary with no update waiting.
      './node_modules/@codemagic/react-native-patch/jest-setup.js',
    ],
    cacheDirectory: '.jest/cache',
    setupFilesAfterEnv: [
      '@testing-library/jest-native/extend-expect',
      './test/testSetupAfterEnv.ts',
    ],
    haste: {
      defaultPlatform: 'ios',
      platforms: ['android', 'ios', 'native'],
    },
    coveragePathIgnorePatterns: ['/node_modules/'],
    // Ensure Jest exits cleanly even if some handles remain (e.g., timers)
    forceExit: true,
    // Avoid watchman dependency in CI/sandbox environments
    watchman: false,
  };
};
