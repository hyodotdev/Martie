const {withGradleProperties} = require('expo/config-plugins');

const ANDROID_GRADLE_PROPERTIES = {
  'org.gradle.jvmargs':
    '-Xmx6144m -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+HeapDumpOnOutOfMemoryError',
  'org.gradle.workers.max': '4',
};

function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    for (const [key, value] of Object.entries(ANDROID_GRADLE_PROPERTIES)) {
      const property = config.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );

      if (property) {
        property.value = value;
      } else {
        config.modResults.push({
          type: 'property',
          key,
          value,
        });
      }
    }

    return config;
  });
}

module.exports = withAndroidGradleMemory;
