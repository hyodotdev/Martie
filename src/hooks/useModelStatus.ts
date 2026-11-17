import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';

let ondeviceAi: typeof import('expo-ondevice-ai') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ondeviceAi = require('expo-ondevice-ai');
} catch {
  // expo-ondevice-ai not available (e.g. web)
}

type ModelState =
  | 'checking'
  | 'ready'
  | 'not_supported'
  | 'needs_setup'
  | 'downloading'
  | 'error';

interface ModelStatus {
  state: ModelState;
  downloadProgress: number;
}

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus>({
    state: 'checking',
    downloadProgress: 0,
  });
  const initialized = useRef(false);
  const downloadingRef = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (Platform.OS === 'web' || !ondeviceAi) {
      setStatus({state: 'not_supported', downloadProgress: 0});
      return;
    }

    (async () => {
      try {
        if (!ondeviceAi!.getDeviceCapability) {
          setStatus({state: 'not_supported', downloadProgress: 0});
          return;
        }

        await ondeviceAi!.initialize();
        const capability = await ondeviceAi!.getDeviceCapability();

        if (__DEV__) {
          console.log(
            '[useModelStatus] capability:',
            JSON.stringify(capability),
          );
        }

        const isReady = capability.isModelReady ?? capability.isSupported;

        if (isReady) {
          setStatus({state: 'ready', downloadProgress: 0});
          return;
        }

        if (capability.isSupported) {
          setStatus({state: 'needs_setup', downloadProgress: 0});
          return;
        }

        setStatus({state: 'not_supported', downloadProgress: 0});
      } catch {
        setStatus({state: 'not_supported', downloadProgress: 0});
      }
    })();
  }, []);

  const downloadModel = useCallback(async () => {
    if (downloadingRef.current || !ondeviceAi) return;
    downloadingRef.current = true;

    setStatus((prev) => ({...prev, state: 'downloading', downloadProgress: 0}));

    try {
      if (Platform.OS === 'android') {
        await ondeviceAi.downloadPromptApiModel((progress) => {
          setStatus((prev) => ({...prev, downloadProgress: progress.progress}));
        });
      } else {
        const models = await ondeviceAi.getAvailableModels();
        if (models.length === 0) {
          setStatus((prev) => ({...prev, state: 'not_supported'}));
          downloadingRef.current = false;
          return;
        }
        await ondeviceAi.downloadModel(models[0].modelId, (progress) => {
          setStatus((prev) => ({...prev, downloadProgress: progress.progress}));
        });
      }

      setStatus((prev) => ({...prev, state: 'ready', downloadProgress: 1}));
    } catch {
      setStatus((prev) => ({...prev, state: 'error'}));
    } finally {
      downloadingRef.current = false;
    }
  }, []);

  return {
    state: status.state,
    isReady: status.state === 'ready',
    isChecking: status.state === 'checking',
    needsSetup: status.state === 'needs_setup',
    isDownloading: status.state === 'downloading',
    isNotSupported: status.state === 'not_supported',
    isError: status.state === 'error',
    downloadProgress: status.downloadProgress,
    downloadModel,
  };
}
