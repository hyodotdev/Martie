import {render} from '@testing-library/react-native';
import React from 'react';

import CustomLoadingIndicator from '../../../src/uis/CustomLoadingIndicator';

jest.mock('kstyled', () => ({
  css: jest.requireActual('kstyled').css,
}));

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  return {
    Typography: {
      Body2: ({children, ...props}: any) =>
        React.createElement(Text, props, children),
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
        },
      },
    }),
  };
});

jest.mock('expo-image', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    Image: (props: any) => React.createElement(View, props),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0}),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: (key: string) => {
    const strings: Record<string, string> = {
      'common.loading': 'Loading Martie',
    };

    return strings[key] ?? key;
  },
}));

describe('CustomLoadingIndicator accessibility', () => {
  it('announces the default loading state as a busy progress indicator', async () => {
    const {getByLabelText} = await render(<CustomLoadingIndicator />);

    const indicator = getByLabelText('Loading Martie');

    expect(indicator.props).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
      accessibilityState: {busy: true},
    });
  });

  it('uses custom loading text as the progress label', async () => {
    const {getByLabelText} = await render(
      <CustomLoadingIndicator text="Loading league" />,
    );

    const indicator = getByLabelText('Loading league');

    expect(indicator.props).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
      accessibilityState: {busy: true},
    });
  });
});
