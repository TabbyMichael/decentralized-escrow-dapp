import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  useToast,
  Input,
  InputGroup,
  InputRightElement,
  Divider,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { FaChevronRight } from 'react-icons/fa';

const EscrowDetailPage = () => {
  const { address } = useParams();
  const { account, provider, signer, getEscrowContract, isConnected } = useWeb3();
  const [escrow, setEscrow] = useState(null);
  const [escrowContract, setEscrowContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const fetchEscrowDetails = useCallback(async () => {
    if (!escrowContract || !provider) return;
    try {
      setLoading(true);
      const [buyer, seller, arbiter, state, contractBalance] = await Promise.all([
        escrowContract.buyer(),
        escrowContract.seller(),
        escrowContract.arbiter(),
        escrowContract.getState(),
        provider.getBalance(address),
      ]);
      setEscrow({ buyer, seller, arbiter, state });
      setBalance(ethers.formatEther(contractBalance));
    } catch (e) {
      console.error('Error fetching escrow details:', e);
      setError('Failed to load escrow details. Please check the address and network.');
    } finally {
      setLoading(false);
    }
  }, [escrowContract, provider, address]);

  useEffect(() => {
    if (isConnected && address) {
      const contract = getEscrowContract(address);
      setEscrowContract(contract);
    }
  }, [address, isConnected, getEscrowContract]);

  useEffect(() => {
    if (escrowContract) {
      fetchEscrowDetails();
      // Listen for events on this specific escrow contract
      const updateListener = () => fetchEscrowDetails();
      escrowContract.on('*', updateListener);
      return () => escrowContract.off('*', updateListener);
    }
  }, [escrowContract, fetchEscrowDetails]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      let tx;
      switch (action.type) {
        case 'DEPOSIT':
          if (!signer) throw new Error("Signer not available");
          tx = await signer.sendTransaction({
            to: address,
            value: ethers.parseEther(action.payload),
          });
          break;
        case 'CONFIRM_SHIPMENT':
          tx = await escrowContract.confirmShipment();
          break;
        case 'RELEASE':
          tx = await escrowContract.release();
          break;
        case 'RAISE_DISPUTE':
          tx = await escrowContract.raiseDispute();
          break;
        case 'RESOLVE_DISPUTE':
          tx = await escrowContract.resolveDispute(action.payload);
          break;
        default:
          throw new Error('Invalid action type');
      }
      await tx.wait();
      toast({ title: 'Success', description: 'Action completed successfully.', status: 'success' });
      fetchEscrowDetails(); // Refresh state
    } catch (e) {
      console.error(`Error on action ${action.type}:`, e);
      toast({ title: 'Action Failed', description: e.message, status: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const truncateAddress = (addr) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  if (!isConnected) return <Container py={10}><Alert status="warning"><AlertIcon />Connect your wallet to view details.</Alert></Container>;
  if (loading) return <Container py={10}><Spinner /></Container>;
  if (error) return <Container py={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
  if (!escrow) return <Container py={10}><Text>No escrow details found.</Text></Container>;

  const isBuyer = account?.toLowerCase() === escrow.buyer?.toLowerCase();
  const isSeller = account?.toLowerCase() === escrow.seller?.toLowerCase();
  const isArbiter = account?.toLowerCase() === escrow.arbiter?.toLowerCase();

  const renderActions = () => {
    switch (escrow.state) {
      case 'AWAITING_PAYMENT':
        return isBuyer && (
          <VStack>
            <InputGroup>
              <Input placeholder="Amount in ETH" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              <InputRightElement children="ETH" />
            </InputGroup>
            <Button colorScheme="blue" onClick={() => handleAction({ type: 'DEPOSIT', payload: depositAmount })} isLoading={actionLoading}>Deposit Funds</Button>
          </VStack>
        );
      case 'AWAITING_DELIVERY':
        return (
          <HStack>
            {isSeller && <Button colorScheme="blue" onClick={() => handleAction({ type: 'CONFIRM_SHIPMENT' })} isLoading={actionLoading}>Confirm Shipment</Button>}
            {(isBuyer || isSeller) && <Button colorScheme="orange" onClick={() => handleAction({ type: 'RAISE_DISPUTE' })} isLoading={actionLoading}>Raise Dispute</Button>}
          </HStack>
        );
      case 'SHIPPED':
        return isBuyer && <Button colorScheme="green" onClick={() => handleAction({ type: 'RELEASE' })} isLoading={actionLoading}>Release Funds</Button>;
      case 'DISPUTED':
        return isArbiter && (
          <VStack>
            <Text>As arbiter, resolve in favor of:</Text>
            <HStack>
              <Button colorScheme="blue" onClick={() => handleAction({ type: 'RESOLVE_DISPUTE', payload: escrow.buyer })} isLoading={actionLoading}>Buyer</Button>
              <Button colorScheme="green" onClick={() => handleAction({ type: 'RESOLVE_DISPUTE', payload: escrow.seller })} isLoading={actionLoading}>Seller</Button>
            </HStack>
          </VStack>
        );
      default:
        return <Tag size="lg" colorScheme="gray">This escrow is {escrow.state.toLowerCase()}.</Tag>;
    }
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6} align="stretch">
        <Breadcrumb spacing="8px" separator={<FaChevronRight color="gray.500" />}>
          <BreadcrumbItem>
            <BreadcrumbLink as={RouterLink} to="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Escrow Details</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <Box>
          <Heading>Escrow Details</Heading>
          <Text fontSize="sm" color="gray.500">{address}</Text>
        </Box>

        <StatGroup>
          <Stat>
            <StatLabel>Balance</StatLabel>
            <StatNumber>{balance} ETH</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Status</StatLabel>
            <StatNumber><Tag colorScheme="blue">{escrow.state}</Tag></StatNumber>
          </Stat>
        </StatGroup>

        <Divider />

        <VStack align="stretch" spacing={3}>
          <Text><strong>Buyer:</strong> {truncateAddress(escrow.buyer)} {isBuyer && <Tag colorScheme="green" size="sm">You</Tag>}</Text>
          <Text><strong>Seller:</strong> {truncateAddress(escrow.seller)} {isSeller && <Tag colorScheme="green" size="sm">You</Tag>}</Text>
          <Text><strong>Arbiter:</strong> {truncateAddress(escrow.arbiter)} {isArbiter && <Tag colorScheme="green" size="sm">You</Tag>}</Text>
        </VStack>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>Actions</Heading>
          {renderActions()}
        </Box>
      </VStack>
    </Container>
  );
};

export default EscrowDetailPage;
