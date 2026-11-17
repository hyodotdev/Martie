import {ActionSheetProvider} from '@expo/react-native-action-sheet';
import {CpkProvider} from 'cpk-ui';
import {KeyboardProvider} from 'react-native-keyboard-controller';

import {theme} from './theme';
import {handleErrorConsole} from './utils/error';
import FallbackComponent from './uis/FallbackComponent';
import ErrorBoundary from 'react-native-error-boundary';

type AppThemeType = 'light' | 'dark';

interface Props {
  initialThemeType?: AppThemeType;
  children?: JSX.Element;
}

export default function RootProvider({
  initialThemeType,
  children,
}: Props): JSX.Element {
  return (
    <CpkProvider
      themeConfig={{
        initialThemeType,
        customTheme: theme,
      }}
    >
      <ErrorBoundary
        FallbackComponent={FallbackComponent}
        onError={handleErrorConsole}
      >
        <KeyboardProvider>
          <ActionSheetProvider>{children}</ActionSheetProvider>
        </KeyboardProvider>
      </ErrorBoundary>
    </CpkProvider>
  );
}
