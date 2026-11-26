import * as React from 'react';
import type {RenderResult} from '@testing-library/react-native';
import {render, waitFor} from '@testing-library/react-native';

import Template from '../../../src/uis/ListEmptyItem';
import {createTestElement, createTestProps} from '../../testUtils';

let props: any;
let component: JSX.Element;
let testingLib: RenderResult;

describe('Rendering', () => {
  beforeEach(() => {
    props = createTestProps();
    component = createTestElement(<Template {...props} />);
  });

  it('renders without crashing', async () => {
    testingLib = await render(component);

    const baseElement = await waitFor(() => testingLib.toJSON());
    expect(baseElement).toBeTruthy();
  });
});
