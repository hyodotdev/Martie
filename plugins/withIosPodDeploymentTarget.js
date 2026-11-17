const {withPodfile} = require('expo/config-plugins');

const DEPLOYMENT_TARGET = '16.4';
const BLOCK = `    # @generated begin withIosPodDeploymentTarget
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
      end
    end
    # @generated end withIosPodDeploymentTarget`;

function withIosPodDeploymentTarget(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('@generated begin withIosPodDeploymentTarget')) {
      return config;
    }

    const reactNativePostInstallPattern =
      /(    react_native_post_install\([\s\S]*?^    \)\n)/m;

    if (!reactNativePostInstallPattern.test(contents)) {
      throw new Error('Could not find react_native_post_install in ios/Podfile');
    }

    config.modResults.contents = contents.replace(
      reactNativePostInstallPattern,
      `$1${BLOCK}\n`,
    );

    return config;
  });
}

module.exports = withIosPodDeploymentTarget;
