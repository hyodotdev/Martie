type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) {
    return maybeError;
  }

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

export const handleErrorConsole = (
  error: unknown,
  componentStack?: string,
): string => {
  const errorMessage = toErrorWithMessage(error).message;

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(error, componentStack);
  }

  return errorMessage;
};

export const logError = (error: unknown, jsErrorName?: string) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(jsErrorName, error);
  }
};
