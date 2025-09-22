import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [escrowBalance, setEscrowBalance] = useState('0');
  const [escrowDetails, setEscrowDetails] = useState({
    buyer: '',
    seller: '',
    arbiter: '',
    state: ''
  });

  // Contract address - update this after deployment
  const escrowAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Hardhat default

  // Initialize provider and signer
  const init = async () => {
    if (window.ethereum) {
      try {
        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Get connected account
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0] || '');
          window.location.reload();
        });
        
        // Create contract instance
        const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, signer);
        
        setProvider(provider);
        setContract(escrowContract);
        
        // Load initial data
        await loadEscrowData(escrowContract);
        
      } catch (error) {
        console.error('Error initializing Web3:', error);
      }
    } else {
      console.log('Please install MetaMask!');
    }
  };

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
        state
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
