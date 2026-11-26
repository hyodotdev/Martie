import {fireEvent, render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import TabMyMobile from '../../app/_Tabs/TabMy/TabMyMobile';
import TabMyTablet from '../../app/_Tabs/TabMy/TabMyTablet';

const theme = {
  bg: {
    paper: '#ffffff',
  },
  role: {
    border: '#dddddd',
    primary: '#2563eb',
  },
  text: {
    placeholder: '#999999',
  },
};

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

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    FlashList: ({data, extraData, renderItem, ListHeaderComponent}: any) =>
      React.createElement(
        View,
        {extraData},
        ListHeaderComponent ? React.createElement(ListHeaderComponent) : null,
        data.map((item: {title: string}, index: number) =>
          React.createElement(
            React.Fragment,
            {key: item.title},
            renderItem({item, index}),
          ),
        ),
      ),
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Icon: () => React.createElement(Text),
    SwitchToggle: ({accessibilityLabel, isOn, onPress}: any) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel,
          accessibilityRole: 'switch',
          accessibilityState: {checked: isOn},
          onPress,
        },
        React.createElement(Text, null, accessibilityLabel),
      ),
    Typography: {
      Body1: TextComponent,
      Body2: TextComponent,
      Body3: TextComponent,
    },
    useCPK: () => ({theme}),
  };
});

jest.mock('../../app/_Tabs/components/SectionHeader', () => ({
  __esModule: true,
  default: () => null,
}));

const createSections = () => {
  const onPurchase = jest.fn();
  const onSubmitQuiz = jest.fn();
  const onToggleDarkMode = jest.fn();
  const onLanguage = jest.fn();

  return {
    handlers: {
      onLanguage,
      onPurchase,
      onSubmitQuiz,
      onToggleDarkMode,
    },
    sections: [
      {
        title: 'Purchase',
        onPress: onPurchase,
      },
      {
        title: 'Quiz Creator',
        description: 'Submit and review community quizzes',
        isExpandable: true,
        subSections: [
          {
            title: 'Submit Quiz',
            onPress: onSubmitQuiz,
          },
        ],
      },
      {
        title: 'Dark Mode',
        isToggle: true,
        isOn: true,
        onPress: onToggleDarkMode,
      },
      {
        title: 'Language',
        label: 'English',
        onPress: onLanguage,
      },
    ],
  };
};

describe('TabMy accessibility', () => {
  it('announces mobile rows, expandable state, and switches', async () => {
    const {handlers, sections} = createSections();
    const {getAllByLabelText, getByLabelText} = await render(
      <TabMyMobile sections={sections as any} />,
    );

    const purchaseRow = getByLabelText('Purchase');

    expect(purchaseRow.props.accessibilityRole).toBe('button');
    await fireEvent.press(purchaseRow);
    expect(handlers.onPurchase).toHaveBeenCalledTimes(1);

    const expandableRow = getByLabelText(
      'Quiz Creator, Submit and review community quizzes',
    );

    expect(expandableRow.props.accessibilityRole).toBe('button');
    expect(expandableRow.props.accessibilityState).toEqual({expanded: false});

    await fireEvent.press(expandableRow);

    const expandedRow = getByLabelText(
      'Quiz Creator, Submit and review community quizzes',
    );
    expect(expandedRow.props.accessibilityState).toEqual({expanded: true});

    const subSectionRow = getByLabelText('Submit Quiz');
    expect(subSectionRow.props.accessibilityRole).toBe('button');
    await fireEvent.press(subSectionRow);
    expect(handlers.onSubmitQuiz).toHaveBeenCalledTimes(1);

    const darkModeSwitch = getByLabelText('Dark Mode');
    expect(darkModeSwitch.props.accessibilityRole).toBe('switch');
    expect(darkModeSwitch.props.accessibilityState).toEqual({checked: true});
    expect(getAllByLabelText('Dark Mode')).toHaveLength(1);
    await fireEvent.press(darkModeSwitch);
    expect(handlers.onToggleDarkMode).toHaveBeenCalledTimes(1);

    const languageRow = getByLabelText('Language, English');
    expect(languageRow.props.accessibilityRole).toBe('button');
    await fireEvent.press(languageRow);
    expect(handlers.onLanguage).toHaveBeenCalledTimes(1);
  });

  it('applies the same accessibility contract on tablet rows', async () => {
    const {sections} = createSections();
    const {getByLabelText} = await render(<TabMyTablet sections={sections as any} />);

    expect(getByLabelText('Purchase').props.accessibilityRole).toBe('button');
    expect(getByLabelText('Dark Mode').props.accessibilityRole).toBe('switch');
    expect(
      getByLabelText('Quiz Creator, Submit and review community quizzes').props
        .accessibilityState,
    ).toEqual({expanded: false});
    expect(getByLabelText('Language, English').props.accessibilityRole).toBe(
      'button',
    );
  });
});
