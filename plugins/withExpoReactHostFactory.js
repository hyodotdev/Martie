const {withMainApplication} = require('expo/config-plugins');

const WRAPPER_HOST_BLOCK = `  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )`;

const FACTORY_HOST_BLOCK = `  private fun getReactPackages(): List<ReactPackage> =
      PackageList(this).packages.apply {
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // add(MyReactNativePackage())
      }

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> = getReactPackages()

        override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }`;

const WRAPPER_REACT_HOST_BLOCK = `  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)`;

const FACTORY_REACT_HOST_BLOCK = `  override val reactHost: ReactHost
    get() =
        ExpoReactHostFactory.getDefaultReactHost(
            context = applicationContext,
            packageList = getReactPackages(),
            jsMainModulePath = ".expo/.virtual-metro-entry",
            useDevSupport = BuildConfig.DEBUG
        )`;

const SDK_57_FACTORY_CALL_END = /(\n[ \t]*}),?(\n[ \t]*\)\n[ \t]*})/;

function patchMainApplication(contents) {
  const usesCrlf = contents.includes('\r\n');
  const normalizedContents = usesCrlf
    ? contents.replace(/\r\n/g, '\n')
    : contents;

  if (!normalizedContents.includes('ReactNativeHostWrapper')) {
    if (
      normalizedContents.includes('ExpoReactHostFactory.getDefaultReactHost(') &&
      !normalizedContents.includes('useDevSupport = BuildConfig.DEBUG')
    ) {
      const patched = normalizedContents.replace(
        SDK_57_FACTORY_CALL_END,
        `$1,
      jsMainModulePath = ".expo/.virtual-metro-entry",
      useDevSupport = BuildConfig.DEBUG$2`,
      );

      if (patched === normalizedContents) {
        throw new Error(
          'Could not add development support to Android MainApplication.kt',
        );
      }

      return usesCrlf ? patched.replace(/\n/g, '\r\n') : patched;
    }

    return contents;
  }

  let patched = normalizedContents.replace(
    'import expo.modules.ReactNativeHostWrapper',
    'import expo.modules.ExpoReactHostFactory',
  );

  patched = patched.replace(WRAPPER_HOST_BLOCK, FACTORY_HOST_BLOCK);
  patched = patched.replace(WRAPPER_REACT_HOST_BLOCK, FACTORY_REACT_HOST_BLOCK);

  if (patched.includes('ReactNativeHostWrapper')) {
    throw new Error(
      'Could not replace ReactNativeHostWrapper in Android MainApplication.kt',
    );
  }

  return usesCrlf ? patched.replace(/\n/g, '\r\n') : patched;
}

function withExpoReactHostFactory(config) {
  return withMainApplication(config, (config) => {
    config.modResults.contents = patchMainApplication(config.modResults.contents);
    return config;
  });
}

module.exports = withExpoReactHostFactory;
module.exports.patchMainApplication = patchMainApplication;
