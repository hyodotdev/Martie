import {fireEvent, render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import ForceUpdateModal from '../../../src/modals/ForceUpdateModal';
import {openMartieStore} from '../../../src/utils/storeLinks';

const mockUseQuery = jest.fn();

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
    styled,
    css: jest.requireActual('kstyled').css,
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
      Heading5: TextComponent,
    },
    useCPK: () => ({
      theme: {
        button: {
          primary: {
            text: '#ffffff',
          },
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

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Soft: 'Soft',
  },
}));

jest.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../../config', () => ({
  appVersion: '1.0.0',
}));

jest.mock('../../../src/STRINGS', () => ({
  t: (key: string) => key,
}));

jest.mock('../../../src/utils/storeLinks', () => ({
  openMartieStore: jest.fn(),
}));

jest.mock('../../../src/uis/GestureHandlerButton', () => {
  const React = jest.requireActual('react');
  const {Pressable} = jest.requireActual('react-native');

  return {
    GestureHandlerButton: ({text, ...props}: any) =>
      React.createElement(Pressable, props, text),
  };
});

describe('ForceUpdateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({version: '9.0.0'});
  });

  it('announces the required update sheet and action', async () => {
    const {getByLabelText, getByText} = await render(<ForceUpdateModal />);

    expect(getByText('forceUpdate.title').props.accessibilityRole).toBe(
      'header',
    );
    expect(
      getByLabelText('forceUpdate.button').props.accessibilityRole,
    ).toBe('button');
  });

  it('opens the Martie store from the update action', async () => {
    const {getByLabelText} = await render(<ForceUpdateModal />);

    await fireEvent.press(getByLabelText('forceUpdate.button'));

    expect(openMartieStore).toHaveBeenCalledTimes(1);
  });

  it('does not render when the installed version is current', async () => {
    mockUseQuery.mockReturnValue({version: '1.0.0'});

    const {queryByText} = await render(<ForceUpdateModal />);

    expect(queryByText('forceUpdate.title')).toBeNull();
  });

  it('reports whether the sheet should block banner ads', async () => {
    const onVisibilityChange = jest.fn();
    const {rerender} = await render(
      <ForceUpdateModal onVisibilityChange={onVisibilityChange} />,
    );

    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);

    mockUseQuery.mockReturnValue({version: '1.0.0'});
    await rerender(<ForceUpdateModal onVisibilityChange={onVisibilityChange} />);

    expect(onVisibilityChange).toHaveBeenLastCalledWith(false);
  });
});
