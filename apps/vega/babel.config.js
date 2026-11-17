const path = require('path');

module.exports = {
  presets: [
    ['module:metro-react-native-babel-preset'],
    'module:@amazon-devices/kepler-module-resolver-preset',
  ],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '^react-native$': path.resolve(
            __dirname,
            'node_modules',
            '@amazon-devices',
            'react-native-kepler',
            'index',
          ),
          '^react-native/(.+)': path.resolve(
            __dirname,
            'node_modules',
            '@amazon-devices',
            'react-native-kepler',
            '\\1',
          ),
        },
      },
    ],
  ],
};
