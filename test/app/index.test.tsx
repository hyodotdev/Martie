import 'react-native';

import type {RenderResult} from '@testing-library/react-native';
import {render, waitFor} from '@testing-library/react-native';

import Page from '../../app/(tabs)/index';
import {createTestElement, createTestProps} from '../testUtils';

let props: any;
let component: JSX.Element;
let testingLib: RenderResult;

describe('Rendering', () => {
  beforeEach(() => {
    props = createTestProps();
    component = createTestElement(<Page {...props} />);
  });

  it('renders without crashing', async () => {
    testingLib = await render(component);

    const baseElement = await waitFor(() => testingLib.toJSON());
    expect(baseElement).toBeTruthy();
  });
});
