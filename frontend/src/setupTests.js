// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.alert for JSDOM environment
global.alert = jest.fn();

import { jest } from '@jest/globals';

// Mock the toaster component as it's not relevant to most tests
// and can cause issues if not handled.
jest.mock('./components/ui/toaster', () => ({
  toaster: {
    create: jest.fn(),
  },
}));
