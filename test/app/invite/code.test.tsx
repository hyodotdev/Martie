import {render, waitFor} from '@testing-library/react-native';

import InviteCode from '../../../app/invite/[code]';

// Mock state
let mockIsAuthenticated = false;
let mockIsAuthLoading = false;
let mockApplyReferralResult: any = {success: true};
const mockReplace = jest.fn();
const mockApplyReferral = jest.fn(() =>
  Promise.resolve(mockApplyReferralResult),
);
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageDelete = jest.fn();
const mockSetAcquisitionSourceOnce = jest.fn();

// Toast mock functions - defined at module scope for hoisting
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastBase = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({code: 'abc12345'})),
  useRouter: jest.fn(() => ({replace: mockReplace})),
  Stack: {Screen: () => null},
}));

jest.mock('convex/react', () => ({
  useConvexAuth: jest.fn(() => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsAuthLoading,
  })),
  useMutation: jest.fn(() => mockApplyReferral),
}));

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    referral: {
      mutations: {applyReferral: 'referral:mutations:applyReferral'},
    },
  },
}));

jest.mock('../../../src/utils/storage', () => ({
  storage: {
    getString: (...args: any[]) => mockStorageGet(...args),
    set: (...args: any[]) => mockStorageSet(...args),
    delete: (...args: any[]) => mockStorageDelete(...args),
  },
  Storage: {PendingReferralCode: 'PendingReferralCode'},
}));

jest.mock('@backpackapp-io/react-native-toast', () => {
  const toastFn: any = (...args: any[]) => mockToastBase(...args);
  toastFn.success = (...args: any[]) => mockToastSuccess(...args);
  toastFn.error = (...args: any[]) => mockToastError(...args);
  return {toast: toastFn};
});

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string) => key),
}));

jest.mock('../../../src/utils/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../../../src/utils/acquisition', () => ({
  setAcquisitionSourceOnce: (...args: any[]) =>
    mockSetAcquisitionSourceOnce(...args),
}));

jest.mock('../../../src/uis/CustomLoadingIndicator', () => {
  return {
    __esModule: true,
    default: function CustomLoadingIndicator() {
      const React = jest.requireActual('react');
      return React.createElement(
        'View',
        {testID: 'loading-indicator'},
        React.createElement('Text', null, 'Loading...'),
      );
    },
  };
});
const {useLocalSearchParams} = jest.requireMock('expo-router');

describe('InviteCode (딥링크)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
    mockIsAuthLoading = false;
    mockApplyReferralResult = {success: true};
    useLocalSearchParams.mockReturnValue({code: 'abc12345'});
  });

  it('로딩 인디케이터를 표시한다', async () => {
    const {getByTestId} = await render(<InviteCode />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('코드가 없으면 홈으로 리다이렉트한다', async () => {
    useLocalSearchParams.mockReturnValue({code: undefined});
    await render(<InviteCode />);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('비로그인 유저는 코드를 저장하고 로그인 화면으로 이동한다', async () => {
    mockIsAuthenticated = false;
    await render(<InviteCode />);

    expect(mockStorageSet).toHaveBeenCalledWith(
      'PendingReferralCode',
      'abc12345',
    );
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });

  it('인증 상태 확인 중에는 리퍼럴 처리와 리다이렉트를 기다린다', async () => {
    mockIsAuthenticated = false;
    mockIsAuthLoading = true;
    const {rerender} = await render(<InviteCode />);

    expect(mockSetAcquisitionSourceOnce).toHaveBeenCalledWith('referral');
    expect(mockApplyReferral).not.toHaveBeenCalled();
    expect(mockStorageSet).not.toHaveBeenCalledWith(
      'PendingReferralCode',
      'abc12345',
    );
    expect(mockReplace).not.toHaveBeenCalled();

    mockIsAuthenticated = true;
    mockIsAuthLoading = false;
    await rerender(<InviteCode />);

    await waitFor(() => {
      expect(mockApplyReferral).toHaveBeenCalledWith({
        referralCode: 'abc12345',
      });
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockStorageSet).not.toHaveBeenCalledWith(
      'PendingReferralCode',
      'abc12345',
    );
  });

  it('로그인 유저는 리퍼럴을 즉시 적용한다', async () => {
    mockIsAuthenticated = true;
    mockApplyReferralResult = {success: true};
    await render(<InviteCode />);

    await waitFor(() => {
      expect(mockApplyReferral).toHaveBeenCalledWith({
        referralCode: 'abc12345',
      });
      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('이미 리퍼럴을 사용한 경우 토스트를 표시한다', async () => {
    mockIsAuthenticated = true;
    mockApplyReferralResult = {success: false, error: 'already_referred'};
    await render(<InviteCode />);

    await waitFor(() => {
      expect(mockToastBase).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('자기 자신의 코드는 토스트를 표시한다', async () => {
    mockIsAuthenticated = true;
    mockApplyReferralResult = {success: false, error: 'self_referral'};
    await render(<InviteCode />);

    await waitFor(() => {
      expect(mockToastBase).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('유효하지 않은 코드는 에러 토스트를 표시한다', async () => {
    mockIsAuthenticated = true;
    mockApplyReferralResult = {success: false, error: 'invalid_code'};
    await render(<InviteCode />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('API 에러 시 에러 토스트를 표시한다', async () => {
    mockIsAuthenticated = true;
    mockApplyReferral.mockRejectedValueOnce(new Error('network error'));
    await render(<InviteCode />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
