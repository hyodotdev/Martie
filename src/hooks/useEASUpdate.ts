import {useState, useCallback, useEffect} from 'react';
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  useUpdates,
} from 'expo-updates';
import {logError} from '../utils/error';
import {logEvent} from '../utils/analytics';

const getUpdateCheckFailureReason = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Network request failed')) {
    return 'network_request_failed';
  }

  if (message.includes('Failed to check for update')) {
    return 'failed_to_check_for_update';
  }

  if (message.includes('checkForUpdateAsync')) {
    return 'native_update_check_rejected';
  }

  return 'unknown';
};

const logUpdateCheckFailure = (error: unknown) => {
  logEvent('update_check_failed', {
    reason: getUpdateCheckFailureReason(error),
  });

  if (!__DEV__) {
    return;
  }

  if (error instanceof Error) {
    console.warn('Failed to check for EAS update:', error.message);
    return;
  }

  console.warn('Failed to check for EAS update:', String(error));
};

export const useEASUpdate = () => {
  const {isUpdatePending, currentlyRunning} = useUpdates(); // currentlyRunning 추가로 현재 버전 확인
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  // 업데이트가 대기 중일 때 앱을 재시작
  useEffect(() => {
    const handlePendingUpdate = async () => {
      if (isUpdatePending) {
        try {
          logEvent('update_pending');
          await reloadAsync(); // 비동기 처리 명시
        } catch (e) {
          logError(e, 'reloadAsync');
          setHasUpdate(false);
        }
      }
    };

    handlePendingUpdate();
  }, [isUpdatePending]);

  // 업데이트 확인 로직
  const checkUpdate = useCallback(async () => {
    // 개발 환경에서는 업데이트 체크를 건너뛰고 로그 추가
    if (__DEV__) {
      console.log('Skipping update check in development mode');
      return false;
    }

    setIsChecking(true);

    let update;
    try {
      update = await checkForUpdateAsync();
    } catch (e) {
      setHasUpdate(false);
      setIsChecking(false);
      logUpdateCheckFailure(e);
      return false;
    }

    try {
      if (update.isAvailable) {
        await fetchUpdateAsync(); // fetch를 기다림
        setHasUpdate(true);
        await reloadAsync();
      }

      return update.isAvailable;
    } catch (e) {
      setHasUpdate(false);
      logError(e, 'applyUpdate');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isChecking,
    hasUpdate,
    checkUpdate,
    currentlyRunning, // 디버깅용으로 현재 실행 중인 버전 반환
  };
};
