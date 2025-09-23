import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Button } from '@chakra-ui/react';
import { FaEthereum } from 'react-icons/fa';
import { toaster } from './ui/toaster';

const WalletConnect = () => {
  const { account, connectWallet, isConnected } = useWeb3();

  const handleConnect = async () => {
    try {
      if (window.ethereum) {
        await connectWallet();
      } else {
        toaster.create({
          title: 'MetaMask not found',
          description: 'Please install MetaMask to use this application.',
          status: 'error',
        });
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      toaster.create({
        title: 'Error connecting to wallet',
        description: error.message,
        status: 'error',
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
