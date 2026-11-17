const path = require('path');

module.exports = {
  root: true,
  extends: ['expo', 'prettier', 'plugin:i18n-json/recommended'],
  plugins: ['prettier'],
  rules: {
    'eslint-comments/no-unlimited-disable': 0,
    'eslint-comments/no-unused-disable': 0,
    'i18n-json/identical-keys': [
      2,
      {
        filePath: path.resolve('./assets/langs/ko.json'),
      },
    ],
    'i18n-json/sorted-keys': [
      2,
      {
        order: 'asc',
        indentSpaces: 2,
      },
    ],
    'i18n-json/valid-message-syntax': [
      2,
      {
        syntax: path.resolve('./custom-syntax-validator.ts'),
      },
    ],
  },
  overrides: [
    {
      // Existing Reanimated shared value patterns are false positives for
      // React Compiler's immutability rule until the plugin understands them.
      files: [
        'src/modals/FirstQuizModal.tsx',
        'src/modals/ForceUpdateModal.tsx',
        'src/modals/SignInRequireModal.tsx',
        'src/modals/StreakRecoveryModal.tsx',
        'src/uis/FallbackComponent.tsx',
        'src/uis/ProgressCircle.tsx',
      ],
      rules: {
        'react-hooks/immutability': 'off',
      },
    },
    {
      files: ['app/article-detail.tsx'],
      rules: {
        'react-hooks/purity': 'off',
      },
    },
    {
      files: ['app/(tabs)/my.tsx', 'app/quiz.tsx'],
      rules: {
        'react-hooks/preserve-manual-memoization': 'off',
      },
    },
    {
      files: [
        'app/(tabs)/my.tsx',
        'app/categories.tsx',
        'app/purchase-iapkit.tsx',
        'app/purchase.tsx',
        'src/hooks/useBulbManager.ts',
        'src/hooks/useLocale.ts',
        'src/hooks/useModelStatus.ts',
        'src/modals/FirstQuizModal.tsx',
        'src/modals/StreakRecoveryModal.tsx',
        'src/modals/common/InputModal.tsx',
        'src/uis/BannerAdmob.tsx',
        'src/uis/Bubble/BubbleWithTypeWriter.tsx',
        'src/uis/QuizView/index.tsx',
      ],
      rules: {
        'react-hooks/set-state-in-effect': 'off',
      },
    },
  ],
};
