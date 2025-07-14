import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    // Mock all Expo and React Native modules
    '^expo-.*$': '<rootDir>/src/__tests__/__mocks__/expo-mock.js',
    '^react-native$': '<rootDir>/src/__tests__/__mocks__/react-native-mock.js',
    '^@typedigital/telemetrydeck-react/(.*)$': '<rootDir>/src/__tests__/__mocks__/telemetrydeck-mock.js',
  },
  globals: {
    __DEV__: false,
  },
};

export default config; 