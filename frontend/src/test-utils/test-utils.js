import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { Web3Context } from '../context/Web3Context';
import { mockWeb3Context } from './mocks';
import { BrowserRouter as Router } from 'react-router-dom';

// Custom render function that includes providers
const render = (
  ui,
  {
    providerProps = mockWeb3Context,
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <Router>
      <ChakraProvider>
        <Web3Context.Provider value={providerProps}>
          {children}
        </Web3Context.Provider>
      </ChakraProvider>
    </Router>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
// Override the render method with our custom one
export { render };
