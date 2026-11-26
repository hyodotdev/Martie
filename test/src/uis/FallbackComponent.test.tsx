import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {Linking, Platform} from 'react-native';
import {restartApp} from '@codemagic/react-native-patch';

import FallbackComponent from '../../../src/uis/FallbackComponent';

jest.mock('@codemagic/react-native-patch', () => ({
  restartApp: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string) => key),
}));

describe('FallbackComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('announces the recovery title and actions', async () => {
    const {getByLabelText, getByText} = await render(<FallbackComponent />);

    expect(getByText('error.title').props.accessibilityRole).toBe('header');
    expect(getByLabelText('error.updateButton').props.accessibilityRole).toBe(
      'button',
    );
    expect(getByLabelText('error.tryAgain').props.accessibilityRole).toBe(
      'button',
    );
  });

  it('opens the selected store URL and falls back to the landing page', async () => {
    jest
      .spyOn(Platform, 'select')
      .mockImplementationOnce((options) => {
        return (options as {default: string}).default;
      });

    const {getByLabelText} = await render(<FallbackComponent />);

    await fireEvent.press(getByLabelText('error.updateButton'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://hyo.dev/martie');
  });

  it('reloads the app when trying again', async () => {
    const {getByLabelText} = await render(<FallbackComponent />);

    await fireEvent.press(getByLabelText('error.tryAgain'));

    await waitFor(() => {
      expect(restartApp).toHaveBeenCalledTimes(1);
    });
  });
});
