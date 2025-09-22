import React from 'react';
import { ChakraProvider, Box, Container, Heading, Text, VStack, HStack, Link, Divider } from '@chakra-ui/react';
import { FaGithub, FaEthereum } from 'react-icons/fa';
import { Web3Provider } from './context/Web3Context';
import WalletConnect from './components/WalletConnect';
import EscrowActions from './components/escrow/EscrowActions';

function App() {
  return (
    <ChakraProvider>
      <Web3Provider>
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

          <Container maxW="container.md" py={10}>
            <VStack spacing={8} align="stretch">
              <Box textAlign="center" mb={8}>
                <Heading as="h1" size="xl" mb={4}>
                  Secure Escrow Service
                </Heading>
                <Text fontSize="lg" color="gray.600">
                  A trustless escrow service powered by Ethereum smart contracts
                </Text>
              </Box>

              <Box 
                bg="white" 
                borderRadius="lg" 
                boxShadow="md" 
                p={6}
                borderWidth="1px"
              >
                <EscrowActions />
              </Box>

              <Box mt={8} pt={6} borderTopWidth="1px">
                <VStack spacing={4}>
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    This is a decentralized application running on the Ethereum blockchain.
                    <br />
                    Connect your wallet to interact with the smart contract.
                  </Text>
                  <HStack spacing={4} justify="center">
                    <Link 
                      href="https://github.com/yourusername/decentralized-escrow-dapp" 
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
                </VStack>
              </Box>
            </VStack>
          </Container>
        </Box>
      </Web3Provider>
    </ChakraProvider>
  );
}

export default App;
