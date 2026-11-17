const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  getKeplerCompatibilityMetroConfig,
} = require('@amazon-devices/kepler-compatibility-metro-config');

const projectRoot = __dirname;

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(
            projectRoot,
            'node_modules',
            '@amazon-devices',
            'react-native-kepler',
            'index.js',
          ),
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
    extraNodeModules: {
      'react-native': path.resolve(
        projectRoot,
        'node_modules',
        '@amazon-devices',
        'react-native-kepler',
        'index.js',
      ),
    },
  },
};

module.exports = mergeConfig(
  getDefaultConfig(projectRoot),
  getKeplerCompatibilityMetroConfig(),
  config,
);
