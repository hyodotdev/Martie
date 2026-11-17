import {
  patchMainApplication,
} from '../../plugins/withExpoReactHostFactory';

describe('withExpoReactHostFactory', () => {
  it('enables Metro and development support for the Expo SDK 57 host', () => {
    const source = `class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // add(MyReactNativePackage())
        }
    )
  }
}`;

    const patched = patchMainApplication(source);

    expect(patched).toContain(
      'jsMainModulePath = ".expo/.virtual-metro-entry"',
    );
    expect(patched).toContain('useDevSupport = BuildConfig.DEBUG');
  });

  it('does not patch the Expo SDK 57 host twice', () => {
    const source = `class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages.apply {
        add(MyReactNativePackage())
      },
      jsMainModulePath = ".expo/.virtual-metro-entry",
      useDevSupport = BuildConfig.DEBUG
    )
  }
}`;

    expect(patchMainApplication(source)).toBe(source);
  });
});
