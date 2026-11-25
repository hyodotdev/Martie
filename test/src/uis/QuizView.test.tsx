import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import QuizView from '../../../src/uis/QuizView';
import type {QuizWithDescriptions} from '../../../src/types';
import {logError} from '../../../src/utils/error';

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

  return {
    Typography: {
      Body3: ({children, ...props}: {children?: ReactNode}) =>
        React.createElement(Text, props, children),
    },
    useCPK: () => ({
      media: {isTablet: false},
      theme: {
        bg: {basic: '#ffffff'},
      },
    }),
  };
});

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    const {View} = jest.requireActual('react-native');
    return React.createElement(View, props);
  },
}));

jest.mock('../../../src/uis/Bubble/Bubble', () => ({
  __esModule: true,
  default: ({text}: {text: string}) => {
    const React = jest.requireActual('react');
    const {Text} = jest.requireActual('react-native');
    return React.createElement(Text, null, text);
  },
}));

// Martie's commentary runs its own timers and has its own tests; this only
// shows which mood he is in.
jest.mock('../../../src/uis/MartieCommentator', () => ({
  __esModule: true,
  default: ({mood}: {mood: string}) => {
    const React = jest.requireActual('react');
    const {Text} = jest.requireActual('react-native');
    return React.createElement(Text, null, `martie:${mood}`);
  },
}));

jest.mock('../../../src/uis/ButtonMartie', () => ({
  __esModule: true,
  default: ({disabled, onPress, text}: any) => {
    const React = jest.requireActual('react');
    const {Text, TouchableOpacity} = jest.requireActual('react-native');
    return React.createElement(
      TouchableOpacity,
      {accessibilityLabel: text, disabled, onPress},
      React.createElement(Text, null, text),
    );
  },
}));

jest.mock('../../../src/uis/QuizView/Result', () => ({
  __esModule: true,
  default: ({isContinuePending, onContinue}: any) => {
    const React = jest.requireActual('react');
    const {Text, TouchableOpacity} = jest.requireActual('react-native');
    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: 'Continue',
        accessibilityState: {
          busy: !!isContinuePending,
          disabled: !!isContinuePending,
        },
        disabled: isContinuePending,
        onPress: onContinue,
      },
      React.createElement(Text, null, 'Continue'),
    );
  },
}));

jest.mock('../../../src/utils/error', () => ({
  logError: jest.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {promise, resolve, reject};
}

const baseQuiz: QuizWithDescriptions = {
  _id: 'quiz-1' as QuizWithDescriptions['_id'],
  _creationTime: 0,
  key: 'quiz_key',
  answerKey: 'answer_key',
  categoryId: 'category-1' as QuizWithDescriptions['categoryId'],
  indexes: [],
  level: 1,
  options: [
    {key: 'answer_key', description: 'Correct answer', isAnswer: true},
    {key: 'wrong_key', description: 'Wrong answer', isAnswer: false},
  ],
  description: 'Question text',
  answerDescription: 'Answer text',
};

describe('QuizView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits an answer once while the result view is pending', () => {
    const onPressAnswer = jest.fn();

    const {getByLabelText} = render(
      <QuizView
        quiz={baseQuiz}
        onPressAnswer={onPressAnswer}
        onContinue={jest.fn()}
        selectedOption={null}
        timeSpentMs={1000}
      />,
    );

    const answerButton = getByLabelText('Correct answer');
    fireEvent.press(answerButton);
    fireEvent.press(answerButton);

    expect(onPressAnswer).toHaveBeenCalledTimes(1);
    expect(onPressAnswer).toHaveBeenCalledWith(baseQuiz.options[0]);
  });

  it('sends Martie into a panic once time runs low', () => {
    const props = {
      quiz: baseQuiz,
      onPressAnswer: jest.fn(),
      onContinue: jest.fn(),
      selectedOption: null,
      timeSpentMs: 1000,
    };
    const {getByText, rerender} = render(<QuizView {...props} />);
    expect(getByText('martie:question')).toBeTruthy();

    rerender(<QuizView {...props} isTimeRunningOut />);
    expect(getByText('martie:hurry')).toBeTruthy();
  });

  it('releases pending answer state after an async submission error', async () => {
    const onPressAnswer = jest
      .fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockImplementationOnce(() => undefined);

    const {getByLabelText} = render(
      <QuizView
        quiz={baseQuiz}
        onPressAnswer={onPressAnswer}
        onContinue={jest.fn()}
        selectedOption={null}
        timeSpentMs={1000}
      />,
    );

    const answerButton = getByLabelText('Correct answer');
    fireEvent.press(answerButton);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        'QuizView.handleAnswerPress',
      );
    });

    fireEvent.press(answerButton);

    expect(onPressAnswer).toHaveBeenCalledTimes(2);
  });

  it('continues once while the result action is pending', async () => {
    const deferred = createDeferred<void>();
    const onContinue = jest.fn(() => deferred.promise);

    const {getByLabelText} = render(
      <QuizView
        quiz={baseQuiz}
        onPressAnswer={jest.fn()}
        onContinue={onContinue}
        selectedOption={baseQuiz.options[0]}
        timeSpentMs={1000}
      />,
    );

    const continueButton = getByLabelText('Continue');
    fireEvent.press(continueButton);
    fireEvent.press(continueButton);

    expect(onContinue).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getByLabelText('Continue').props.accessibilityState).toEqual({
        busy: true,
        disabled: true,
      });
    });

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByLabelText('Continue').props.accessibilityState).toEqual({
        busy: false,
        disabled: false,
      });
    });
  });

  it('keeps synchronous continue guarded until the next microtask', async () => {
    const onContinue = jest.fn();

    const {getByLabelText} = render(
      <QuizView
        quiz={baseQuiz}
        onPressAnswer={jest.fn()}
        onContinue={onContinue}
        selectedOption={baseQuiz.options[0]}
        timeSpentMs={1000}
      />,
    );

    const continueButton = getByLabelText('Continue');
    fireEvent.press(continueButton);
    fireEvent.press(continueButton);

    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByLabelText('Continue').props.accessibilityState).toEqual({
        busy: false,
        disabled: false,
      });
    });

    fireEvent.press(getByLabelText('Continue'));

    expect(onContinue).toHaveBeenCalledTimes(2);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('releases pending continue state after an async failure', async () => {
    const failedAttempt = createDeferred<void>();
    const retryAttempt = createDeferred<void>();
    const onContinue = jest
      .fn()
      .mockReturnValueOnce(failedAttempt.promise)
      .mockReturnValueOnce(retryAttempt.promise);

    const {getByLabelText} = render(
      <QuizView
        quiz={baseQuiz}
        onPressAnswer={jest.fn()}
        onContinue={onContinue}
        selectedOption={baseQuiz.options[0]}
        timeSpentMs={1000}
      />,
    );

    fireEvent.press(getByLabelText('Continue'));

    await act(async () => {
      failedAttempt.reject(new Error('navigation failed'));
      await failedAttempt.promise.catch(() => undefined);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        'QuizView.handleContinuePress',
      );
    });

    fireEvent.press(getByLabelText('Continue'));

    expect(onContinue).toHaveBeenCalledTimes(2);
  });
});
