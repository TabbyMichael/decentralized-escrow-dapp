import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';
import config from '../config.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [networkError, setNetworkError] = useState('');
  const [escrowBalance, setEscrowBalance] = useState('0');
  const [escrowDetails, setEscrowDetails] = useState({
    buyer: '',
    seller: '',
    arbiter: '',
    state: ''
  });

  const init = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        const network = await provider.getNetwork();
        const networkId = network.chainId.toString();

        const networkConfig = config[networkId];
        if (!networkConfig) {
          setNetworkError(`Unsupported network. Please switch to a supported network (e.g., Hardhat localnet).`);
          return;
        }
        setNetworkError('');

        const signer = await provider.getSigner();
        const connectedAccount = await signer.getAddress();
        setAccount(connectedAccount);

        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0] || '');
          window.location.reload(); // Simple reload for state consistency
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });

        const escrowContract = new ethers.Contract(networkConfig.escrowAddress, Escrow.abi, signer);
        setContract(escrowContract);
        
        await loadEscrowData(escrowContract);
        
      } catch (error) {
        console.error('Error initializing Web3:', error);
        setNetworkError('Failed to initialize Web3. See console for details.');
      }
    } else {
      setNetworkError('Please install MetaMask!');
    }
  };

  const stateMapping = [
    "AWAITING_PAYMENT",
    "AWAITING_DELIVERY",
    "COMPLETE",
    "REFUNDED",
    "DISPUTED"
  ];

  // Load escrow data
  const loadEscrowData = async (escrowContract) => {
    try {
      const [buyer, seller, arbiter, state, balance] = await Promise.all([
        escrowContract.buyer(),
        escrowContract.seller(),
        escrowContract.arbiter(),
        escrowContract.getState(),
        escrowContract.getBalance()
      ]);
      
      setEscrowDetails({
        buyer,
        seller,
        arbiter,
        state: stateMapping[Number(state)]
      });
      
      setEscrowBalance(ethers.formatEther(balance));
      
    } catch (error) {
      console.error('Error loading escrow data:', error);
    }
  };

  // Deposit funds to escrow
  const depositFunds = async (amount) => {
    try {
      const tx = await contract.deposit({ value: ethers.parseEther(amount) });
      await tx.wait();
      await loadEscrowData(contract);
      return { success: true };
    } catch (error) {
      console.error('Error depositing funds:', error);
      return { success: false, error: error.message };
    }
  };

  // Release funds to seller
  const releaseFunds = async () => {
    try {
      const tx = await contract.release();
      await tx.wait();
      await loadEscrowData(contract);
      return { success: true };
    } catch (error) {
      console.error('Error releasing funds:', error);
      return { success: false, error: error.message };
    }
  };

  // Refund buyer
  const refundBuyer = async () => {
    try {
      const tx = await contract.refund();
      await tx.wait();
      await loadEscrowData(contract);
      return { success: true };
    } catch (error) {
      console.error('Error refunding buyer:', error);
      return { success: false, error: error.message };
    }
  };

  // Resolve dispute
  const resolveDispute = async (winner) => {
    try {
      const tx = await contract.resolveDispute(winner);
      await tx.wait();
      await loadEscrowData(contract);
      return { success: true };
    } catch (error) {
      console.error('Error resolving dispute:', error);
      return { success: false, error: error.message };
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (window.ethereum) {
      init();
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        contract,
        provider,
        escrowBalance,
        escrowDetails,
        depositFunds,
        releaseFunds,
        refundBuyer,
        resolveDispute,
        isConnected: !!account,
        networkError,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export default Web3Context;
