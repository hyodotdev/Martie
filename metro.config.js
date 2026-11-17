const {getDefaultConfig} = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs', 'mjs');
const programsPath = path.resolve(__dirname, 'programs').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  new RegExp(programsPath + '/.*'),
];

module.exports = config;
