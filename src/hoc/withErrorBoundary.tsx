import React from 'react';
import ErrorBoundary from 'react-native-error-boundary';
import FallbackComponent from '../uis/FallbackComponent';
import {handleErrorConsole} from '../utils/error';

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
): React.ComponentType<P> {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary
        FallbackComponent={FallbackComponent}
        onError={handleErrorConsole}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
