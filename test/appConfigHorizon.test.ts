import type {ExpoConfig} from '@expo/config';

// Meta rejects Horizon builds that request READ_PHONE_STATE. Horizon SDK
// manifests without a targetSdkVersion make the manifest merger imply it, so
// the Horizon config has to block it explicitly.
function loadConfig(env: Record<string, string>): ExpoConfig {
  const saved = {...process.env};
  Object.assign(process.env, env);
  try {
    let config: ExpoConfig | undefined;
    jest.isolateModules(() => {
      const {default: build} =
        jest.requireActual<typeof import('../app.config')>('../app.config');
      config = build({config: {}} as Parameters<typeof build>[0]);
    });
    if (!config) throw new Error('app.config did not load');
    return config;
  } finally {
    process.env = saved;
  }
}

describe('Horizon app config', () => {
  it('blocks READ_PHONE_STATE', () => {
    const config = loadConfig({HORIZON_OS: '1', META_HORIZON_APP_ID: '1'});

    expect(config.android?.blockedPermissions).toContain(
      'android.permission.READ_PHONE_STATE',
    );
  });
});
