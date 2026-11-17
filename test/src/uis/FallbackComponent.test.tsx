import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {Linking, Platform} from 'react-native';
import {reloadAsync} from 'expo-updates';

import FallbackComponent from '../../../src/uis/FallbackComponent';

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(() => Promise.resolve()),
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

  it('announces the recovery title and actions', () => {
    const {getByLabelText, getByText} = render(<FallbackComponent />);

    expect(getByText('error.title').props.accessibilityRole).toBe('header');
    expect(getByLabelText('error.updateButton').props.accessibilityRole).toBe(
      'button',
    );
    expect(getByLabelText('error.tryAgain').props.accessibilityRole).toBe(
      'button',
    );
  });

  it('opens the selected store URL and falls back to the landing page', () => {
    jest
      .spyOn(Platform, 'select')
      .mockImplementationOnce((options) => {
        return (options as {default: string}).default;
      });

    const {getByLabelText} = render(<FallbackComponent />);

    fireEvent.press(getByLabelText('error.updateButton'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://hyo.dev/martie');
  });

  it('reloads the app when trying again', async () => {
    const {getByLabelText} = render(<FallbackComponent />);

    fireEvent.press(getByLabelText('error.tryAgain'));

    await waitFor(() => {
      expect(reloadAsync).toHaveBeenCalledTimes(1);
    });
  });
});
