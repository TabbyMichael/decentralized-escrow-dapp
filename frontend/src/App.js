import React from 'react';
import { ChakraProvider, Box, Container, Heading, HStack, Link } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
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
            {/* Header */}
            <Box bg="white" boxShadow="sm" borderBottomWidth="1px">
              <Container maxW="container.lg" py={4}>
                <HStack justifyContent="space-between" alignItems="center">
                  <HStack as={RouterLink} to="/" spacing={4} _hover={{ textDecoration: 'none' }}>
                    <FaEthereum size={28} color="#805AD5" />
                    <Heading size="lg" color="purple.600">
                      Decentralized Escrow
                    </Heading>
                  </HStack>
                  <WalletConnect />
                </HStack>
              </Container>
            </Box>

            {/* Main Content */}
            <main>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/escrow/:address" element={<EscrowDetailPage />} />
              </Routes>
            </main>

            {/* Footer */}
            <Box as="footer" mt={8} pt={6} borderTopWidth="1px">
              <Container maxW="container.lg">
                <HStack spacing={4} justify="center">
                  <Link
                    href="https://github.com/TabbyMichael/decentralized-escrow-dapp"
                    isExternal
                    display="flex"
                    alignItems="center"
                    color="purple.600"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    <FaGithub style={{ marginRight: '8px' }} />
                    View on GitHub
                  </Link>
                </HStack>
              </Container>
            </Box>
          </Box>
        </Router>
      </Web3Provider>
    </ChakraProvider>
  );
}

export default App;
