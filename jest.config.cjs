const project=require('./extension-project.json');
module.exports = {
  preset: 'ts-jest', testEnvironment: 'jsdom', testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {'\\.css$': '<rootDir>/dev/style-mock.cjs'},
  transform: {'^.+\\.tsx?$': ['ts-jest', {tsconfig: {module: 'CommonJS', moduleResolution: 'Node', jsx: project.hostContract.jsxMode === 'automatic' ? 'react-jsx' : 'react'}}]}
};
