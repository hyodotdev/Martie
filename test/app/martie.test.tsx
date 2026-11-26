import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';
import {Linking, Platform, View} from 'react-native';

import MartieLanding from '../../app/martie';

jest.mock('kstyled', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  const createStyled = (Component: any) => {
    const createComponent = () => {
      function StyledComponent({children, ...props}: {children?: ReactNode}) {
        return React.createElement(Component, props, children);
      }

      return StyledComponent;
    };
    const template = () => createComponent();
    template.__withStyles = () => createComponent();
    return template;
  };

  const styled = new Proxy(createStyled, {
    get: (_target, componentName: string) =>
      createStyled(ReactNative[componentName]),
  });

  return {
    css: jest.requireActual('kstyled').css,
    styled,
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: TextComponent,
      Heading2: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
        },
        role: {
          border: '#dddddd',
        },
        text: {
          basic: '#111111',
          placeholder: '#777777',
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

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('../../src/uis/ButtonMartie', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  return function ButtonMartie({
    accessibilityRole = 'button',
    onPress,
    text,
  }: {
    accessibilityRole?: string;
    onPress: () => void;
    text: string;
  }) {
    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: text,
        accessibilityRole,
        onPress,
      },
      React.createElement(Text, null, text),
    );
  };
});

jest.mock('../../src/icons', () => ({
  IC_MARTIE_BASIC: 'martie-basic.png',
  IC_WORDMARK: 'wordmark.png',
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string) => {
    const strings: Record<string, string> = {
      'landing.androidButton': 'Google Play',
      'landing.body':
        "Take today's 5-question challenge, keep a streak, and review what you missed with Martie.",
      'landing.iosButton': 'App Store',
      'landing.title': 'Daily trivia in 2 minutes',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/utils/constants', () => ({
  APP_STORE_URLS: {
    android:
      'https://play.google.com/store/apps/details?id=dev.hyo.martie',
    ios: 'https://apps.apple.com/app/martie/id123456789',
  },
}));

jest.mock('../../src/utils/analytics', () => ({
  logEvent: jest.fn(),
}));

describe('MartieLanding accessibility', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
  });

  it('exposes a heading and external store links', () => {
    const {getByLabelText, getByText} = render(<MartieLanding />);

    expect(getByText('Daily trivia in 2 minutes').props.accessibilityRole).toBe(
      'header',
    );
    expect(getByLabelText('App Store').props.accessibilityRole).toBe('link');
    expect(getByLabelText('Google Play').props.accessibilityRole).toBe('link');
  });

  it('hides decorative landing images from assistive tech', () => {
    const {UNSAFE_getAllByType} = render(<MartieLanding />);
    const images = UNSAFE_getAllByType(View).filter(
      (node) =>
        node.props.source === 'wordmark.png' ||
        node.props.source === 'martie-basic.png',
    );

    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image.props).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no',
      });
    }
  });

  it('opens app store URLs with share landing source context', () => {
    const {getByLabelText} = render(<MartieLanding />);

    fireEvent.press(getByLabelText('App Store'));
    fireEvent.press(getByLabelText('Google Play'));

    expect(Linking.openURL).toHaveBeenNthCalledWith(
      1,
      'https://apps.apple.com/app/martie/id123456789?source=share_landing',
    );
    expect(Linking.openURL).toHaveBeenNthCalledWith(
      2,
      'https://play.google.com/store/apps/details?id=dev.hyo.martie&referrer=source%3Dshare_landing',
    );
  });
});
