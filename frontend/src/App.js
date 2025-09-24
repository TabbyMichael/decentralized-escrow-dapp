import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box, Container, Heading, HStack, Link as ChakraLink } from '@chakra-ui/react';
import { FaGithub, FaEthereum } from 'react-icons/fa';
import { Web3Provider } from './context/Web3Context';
import WalletConnect from './components/WalletConnect';
import DashboardPage from './pages/DashboardPage';
import EscrowDetailPage from './pages/EscrowDetailPage';

function App() {
  return (
    <ChakraProvider>
      <Web3Provider>
        <Router>
          <Box minH="100vh" bg="gray.50">
            <Box bg="white" boxShadow="sm" borderBottomWidth="1px">
              <Container maxW="container.lg" py={4}>
                <HStack justifyContent="space-between" alignItems="center">
                  <HStack spacing={4}>
                    <FaEthereum size={28} color="#805AD5" />
                    <Heading size="lg" color="purple.600">Decentralized Escrow</Heading>
                  </HStack>
                  <WalletConnect />
                </HStack>
              </Container>
            </Box>

            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/escrow/:address" element={<EscrowDetailPage />} />
            </Routes>

            <Container maxW="container.lg" mt={8} pt={6} borderTopWidth="1px" as="footer">
                <HStack spacing={4} justify="center">
                  <ChakraLink
                    href="https://github.com/yourusername/decentralized-escrow-dapp"
                    isExternal
                    display="flex"
                    alignItems="center"
                    color="purple.600"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    <FaGithub style={{ marginRight: '8px' }} />
                    View on GitHub
                  </ChakraLink>
                </HStack>
            </Container>
          </Box>
        </Router>
      </Web3Provider>
    </ChakraProvider>
  );
}

export default App;
