import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  VStack, 
  HStack, 
  Text, 
  Input, 
  InputGroup, 
  InputRightElement, 
  useToast,
  Badge,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
  Tooltip
} from '@chakra-ui/react';
import { FaEthereum, FaArrowRight, FaArrowLeft, FaHandHoldingUsd, FaHandsHelping } from 'react-icons/fa';
import { useWeb3 } from '../../context/Web3Context';

const EscrowActions = () => {
  const { 
    account, 
    escrowBalance, 
    escrowDetails, 
    depositFunds, 
    releaseFunds, 
    refundBuyer,
    resolveDispute,
    isConnected 
  } = useWeb3();
  
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState({
    deposit: false,
    release: false,
    refund: false,
    resolve: false
  });
  const toast = useToast();

  const handleDeposit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount to deposit',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(prev => ({ ...prev, deposit: true }));
    try {
      const result = await depositFunds(amount);
      if (result.success) {
        toast({
          title: 'Deposit successful',
          description: `${amount} ETH has been deposited to escrow`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setAmount('');
      } else {
        throw new Error(result.error || 'Failed to deposit');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      toast({
        title: 'Deposit failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(prev => ({ ...prev, deposit: false }));
    }
  };

  const handleRelease = async () => {
    setIsLoading(prev => ({ ...prev, release: true }));
    try {
      const result = await releaseFunds();
      if (result.success) {
        toast({
          title: 'Funds released',
          description: 'Funds have been released to the seller',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to release funds');
      }
    } catch (error) {
      console.error('Release error:', error);
      toast({
        title: 'Release failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(prev => ({ ...prev, release: false }));
    }
  };

  const handleRefund = async () => {
    setIsLoading(prev => ({ ...prev, refund: true }));
    try {
      const result = await refundBuyer();
      if (result.success) {
        toast({
          title: 'Refund processed',
          description: 'Funds have been refunded to the buyer',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Refund error:', error);
      toast({
        title: 'Refund failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(prev => ({ ...prev, refund: false }));
    }
  };

  const handleResolveDispute = async (winner) => {
    setIsLoading(prev => ({ ...prev, resolve: true }));
    try {
      const result = await resolveDispute(winner);
      if (result.success) {
        toast({
          title: 'Dispute resolved',
          description: `Funds have been sent to ${winner === account ? 'you' : 'the other party'}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to resolve dispute');
      }
    } catch (error) {
      console.error('Dispute resolution error:', error);
      toast({
        title: 'Failed to resolve dispute',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(prev => ({ ...prev, resolve: false }));
    }
  };

  const isBuyer = account?.toLowerCase() === escrowDetails.buyer?.toLowerCase();
  const isSeller = account?.toLowerCase() === escrowDetails.seller?.toLowerCase();
  const isArbiter = account?.toLowerCase() === escrowDetails.arbiter?.toLowerCase();
  const isAwaitingPayment = escrowDetails.state === 'AWAITING_PAYMENT';
  const isAwaitingDelivery = escrowDetails.state === 'AWAITING_DELIVERY';
  const isComplete = escrowDetails.state === 'COMPLETE';
  const isRefunded = escrowDetails.state === 'REFUNDED';
  const isDisputed = escrowDetails.state === 'DISPUTED';
  const isParticipant = isBuyer || isSeller || isArbiter;

  const truncateAddress = (address) => {
    if (!address) return '0x0...0';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Box p={5} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <VStack spacing={6} align="stretch">
        <StatGroup>
          <Stat>
            <StatLabel>Escrow Balance</StatLabel>
            <StatNumber>{parseFloat(escrowBalance).toFixed(4)} ETH</StatNumber>
            <StatHelpText>
              <StatArrow type={parseFloat(escrowBalance) > 0 ? 'increase' : 'decrease'} />
              {parseFloat(escrowBalance) > 0 ? 'Funds in escrow' : 'No funds in escrow'}
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Status</StatLabel>
            <Badge 
              colorScheme={
                isAwaitingPayment ? 'yellow' : 
                isAwaitingDelivery ? 'blue' :
                isComplete ? 'green' :
                isRefunded ? 'purple' :
                'red'
              }
              fontSize="md"
              p={1}
              borderRadius="md"
            >
              {escrowDetails.state || 'Loading...'}
            </Badge>
          </Stat>
        </StatGroup>

        <Divider />

        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontSize="sm" color="gray.500">Buyer</Text>
            <Text fontWeight="medium">
              {truncateAddress(escrowDetails.buyer)}
              {isBuyer && <Badge ml={2} colorScheme="green">You</Badge>}
            </Text>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.500">Seller</Text>
            <Text fontWeight="medium">
              {truncateAddress(escrowDetails.seller)}
              {isSeller && <Badge ml={2} colorScheme="green">You</Badge>}
            </Text>
          </Box>
          
          {escrowDetails.arbiter !== '0x0000000000000000000000000000000000000000' && (
            <Box>
              <Text fontSize="sm" color="gray.500">Arbiter</Text>
              <Text fontWeight="medium">
                {truncateAddress(escrowDetails.arbiter)}
                {isArbiter && <Badge ml={2} colorScheme="green">You</Badge>}
              </Text>
            </Box>
          )}
        </VStack>

        <Divider />

        {isAwaitingPayment && isBuyer && (
          <VStack spacing={4}>
            <InputGroup>
              <Input
                type="number"
                placeholder="Amount in ETH"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <InputRightElement width="4.5rem">
                <Text>ETH</Text>
              </InputRightElement>
            </InputGroup>
            <Button
              leftIcon={<FaHandHoldingUsd />}
              colorScheme="blue"
              width="100%"
              onClick={handleDeposit}
              isLoading={isLoading.deposit}
              loadingText="Depositing..."
            >
              Deposit to Escrow
            </Button>
          </VStack>
        )}

        {isAwaitingDelivery && (
          <VStack spacing={3}>
            {isBuyer && (
              <Tooltip label="Release funds to the seller" placement="top">
                <Button
                  leftIcon={<FaArrowRight />}
                  colorScheme="green"
                  width="100%"
                  onClick={handleRelease}
                  isLoading={isLoading.release}
                  loadingText="Releasing..."
                >
                  Release to Seller
                </Button>
              </Tooltip>
            )}
            
            {(isBuyer || isArbiter) && (
              <Tooltip 
                label={
                  isBuyer 
                    ? "Request a refund if the terms aren't met" 
                    : "As arbiter, you can issue a refund to the buyer"
                } 
                placement="top"
              >
                <Button
                  leftIcon={<FaArrowLeft />}
                  colorScheme="red"
                  variant="outline"
                  width="100%"
                  onClick={handleRefund}
                  isLoading={isLoading.refund}
                  loadingText="Processing..."
                >
                  {isBuyer ? 'Request Refund' : 'Issue Refund'}
                </Button>
              </Tooltip>
            )}
          </VStack>
        )}

        {isAwaitingDelivery && isArbiter && (
          <VStack spacing={3} mt={4} pt={4} borderTopWidth="1px">
            <Text fontSize="sm" color="gray.600" textAlign="center">
              As the arbiter, you can resolve disputes
            </Text>
            <HStack spacing={4} width="100%">
              <Button
                leftIcon={<FaArrowRight />}
                colorScheme="green"
                flex={1}
                onClick={() => handleResolveDispute(escrowDetails.seller)}
                isLoading={isLoading.resolve}
                loadingText="Resolving..."
                size="sm"
              >
                Favor Seller
              </Button>
              <Button
                leftIcon={<FaArrowLeft />}
                colorScheme="blue"
                flex={1}
                onClick={() => handleResolveDispute(escrowDetails.buyer)}
                isLoading={isLoading.resolve}
                loadingText="Resolving..."
                size="sm"
              >
                Favor Buyer
              </Button>
            </HStack>
          </VStack>
        )}

        {(isComplete || isRefunded || isDisputed) && (
          <Box textAlign="center" py={4}>
            <Text color="gray.600">
              This escrow is {isComplete ? 'completed' : isRefunded ? 'refunded' : 'disputed'}. No further actions are available.
            </Text>
          </Box>
        )}

        {!isConnected && (
          <Box textAlign="center" py={4}>
            <Text color="gray.600">Please connect your wallet to interact with the escrow.</Text>
          </Box>
        )}

        {isConnected && !isParticipant && (
          <Box textAlign="center" py={4} bg="orange.50" borderRadius="md">
            <Text color="orange.800" fontWeight="medium">
              You are not a party to this escrow agreement (buyer, seller, or arbiter).
            </Text>
            <Text color="orange.700" fontSize="sm" mt={1}>
              Your connected address: {truncateAddress(account)}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default EscrowActions;
