module.exports = {
  Worklets: {
    defaultContext: {
      createRunAsync: jest.fn(),
      createRunOnJS: jest.fn(),
    },
    createContext: jest.fn(),
    createRunOnJS: jest.fn(),
    createSharedValue: jest.fn(),
  },
  createSerializable: jest.fn(() => ({value: null})),
};
