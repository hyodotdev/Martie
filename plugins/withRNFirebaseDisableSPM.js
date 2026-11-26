const {withPodfile} = require('expo/config-plugins');

// react-native-firebase resolves Firebase through Swift Package Manager by
// default, and refuses static framework linkage in that mode. Martie links
// pods statically, so it stays on CocoaPods-only Firebase.
const BLOCK = `# @generated begin withRNFirebaseDisableSPM
$RNFirebaseDisableSPM = true
# @generated end withRNFirebaseDisableSPM`;

function withRNFirebaseDisableSPM(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('@generated begin withRNFirebaseDisableSPM')) {
      return config;
    }

    config.modResults.contents = `${BLOCK}\n${contents}`;
    return config;
  });
}

module.exports = withRNFirebaseDisableSPM;
