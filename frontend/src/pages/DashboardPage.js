import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  List,
  ListItem,
  HStack,
  Tag,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import CreateEscrow from '../components/escrow/CreateEscrow';

const DashboardPage = () => {
  const { escrows, loading, isConnected } = useWeb3();

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const renderContent = () => {
    if (!isConnected) {
      return (
        <Alert status="warning">
          <AlertIcon />
          Please connect your wallet to view escrows.
        </Alert>
      );
    }

    if (loading) {
      return (
        <VStack>
          <Spinner size="xl" />
          <Text>Loading escrows...</Text>
        </VStack>
      );
    }

    if (escrows.length === 0) {
      return (
        <Alert status="info">
          <AlertIcon />
          No escrows found. Be the first to create one!
        </Alert>
      );
    }

    return (
      <List spacing={4} width="100%">
        {escrows.map((escrow) => (
          <ListItem
            key={escrow.address}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            boxShadow="sm"
            _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <HStack justifyContent="space-between">
              <Box>
                <Heading size="sm" as={Link} to={`/escrow/${escrow.address}`} color="purple.600">
                  Escrow: {truncateAddress(escrow.address)}
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  Buyer: {truncateAddress(escrow.buyer)}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Seller: {truncateAddress(escrow.seller)}
                </Text>
              </Box>
              <Tag colorScheme="blue">{escrow.state}</Tag>
            </HStack>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Container maxW="container.lg" py={10}>
      <VStack spacing={8}>
        <HStack justifyContent="space-between" width="100%">
          <Heading as="h1" size="xl">
            Escrow Dashboard
          </Heading>
          <CreateEscrow />
        </HStack>
        {renderContent()}
      </VStack>
    </Container>
  );
};

export default DashboardPage;
