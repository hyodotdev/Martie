import {act} from '@testing-library/react-native';
import type {TestInstance} from 'test-renderer';

type Fiber = {
  memoizedProps?: {onPress?: unknown} | null;
  return: Fiber | null;
};

// Same lookup as fireEvent: the element's own props, then the composite
// components above it, then the host elements above those.
export const findPressHandler = (element: TestInstance): (() => void) | undefined => {
  let node: TestInstance | null = element;
  while (node) {
    if (typeof node.props.onPress === 'function') return node.props.onPress;
    let fiber = (node.unstable_fiber as Fiber | null)?.return ?? null;
    while (fiber?.memoizedProps) {
      const {onPress} = fiber.memoizedProps;
      if (typeof onPress === 'function') return onPress as () => void;
      fiber = fiber.return;
    }
    node = node.parent;
  }
  return undefined;
};

/**
 * Presses each element once, in order, without waiting for the handlers'
 * promises. `fireEvent.press` awaits them, so it never returns while a test
 * keeps the request pending on purpose (double-submit and in-flight checks).
 */
export const pressWithoutWaiting = async (
  ...elements: TestInstance[]
): Promise<void> => {
  await act(async () => {
    for (const element of elements) {
      findPressHandler(element)?.();
    }
    // One real tick lets the handlers run up to the request they await.
    await new Promise<void>((resolve) =>
      jest.requireActual<typeof import('timers')>('timers').setImmediate(
        resolve,
      ),
    );
  });
};
