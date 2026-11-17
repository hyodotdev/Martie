module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-kstyled', {debug: false, strict: true}],
      // Reanimated v4 moved the Babel plugin to react-native-worklets
      'react-native-worklets/plugin',
    ],
  };
};
