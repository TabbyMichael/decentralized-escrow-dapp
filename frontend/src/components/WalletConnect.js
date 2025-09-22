import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Button, useToast } from '@chakra-ui/react';
import { FaEthereum } from 'react-icons/fa';

const WalletConnect = () => {
  const { account, connectWallet, isConnected } = useWeb3();
  const toast = useToast();

  const handleConnect = async () => {
    try {
      if (window.ethereum) {
        await connectWallet();
      } else {
        toast({
          title: 'MetaMask not found',
          description: 'Please install MetaMask to use this application.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      toast({
        title: 'Error connecting to wallet',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Button
      leftIcon={<FaEthereum />}
      colorScheme={isConnected ? 'green' : 'blue'}
      variant="solid"
      onClick={handleConnect}
      disabled={isConnected}
    >
      {isConnected ? `Connected: ${truncateAddress(account)}` : 'Connect Wallet'}
    </Button>
  );
};

export default WalletConnect;
