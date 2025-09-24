import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import EscrowFactory from '../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';

// A generic ERC20 ABI for interacting with token contracts
const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
];

export const Web3Context = createContext();
export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const factoryAddress = process.env.REACT_APP_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const connectWallet = useCallback(async () => {
    // ... (same as before)
  }, [factoryAddress]);

  const fetchEscrows = useCallback(async () => {
    if (!factoryContract || !provider) return;
    setLoading(true);
    try {
      const escrowAddresses = await factoryContract.getDeployedEscrows();
      const escrowsData = await Promise.all(
        escrowAddresses.map(async (address) => {
          const escrowContract = new ethers.Contract(address, Escrow.abi, provider);
          const [buyer, seller, arbiter, state, token, amount] = await Promise.all([
            escrowContract.buyer(),
            escrowContract.seller(),
            escrowContract.arbiter(),
            escrowContract.currentState(), // Note: no longer a function call
            escrowContract.token(),
            escrowContract.amount(),
          ]);
          const tokenContract = new ethers.Contract(token, erc20Abi, provider);
          const tokenSymbol = await tokenContract.symbol();
          return { address, buyer, seller, arbiter, state, token, amount, tokenSymbol };
        })
      );
      setEscrows(escrowsData.reverse());
    } catch (error) {
      console.error("Error fetching escrows:", error);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, provider]);

  const createEscrow = async (seller, arbiter, token, amount) => {
    if (!factoryContract) throw new Error("Factory contract not initialized");
    try {
      const tx = await factoryContract.createEscrow(seller, arbiter, token, amount);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'EscrowCreated');
      if (!event) throw new Error("EscrowCreated event not found");
      return { success: true, address: event.args[0] };
    } catch (error) {
      console.error("Error creating escrow:", error);
      return { success: false, error };
    }
  };

  const getEscrowContract = useCallback((escrowAddress) => {
    if (!signer) return null;
    return new ethers.Contract(escrowAddress, Escrow.abi, signer);
  }, [signer]);

  const approveToken = async (tokenAddress, spenderAddress, amount) => {
    if (!signer) throw new Error("Signer not available");
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const tx = await tokenContract.approve(spenderAddress, amount);
    await tx.wait();
  };

  const getAllowance = async (tokenAddress, ownerAddress, spenderAddress) => {
    if (!provider) throw new Error("Provider not available");
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    return await tokenContract.allowance(ownerAddress, spenderAddress);
  };

  useEffect(() => {
    // ... (same connectWallet call)
  }, [connectWallet]);

  useEffect(() => {
    if (factoryContract && provider) {
      fetchEscrows();
      // The event listener is simplified as it just triggers a refetch for now.
      // A more advanced implementation could add the new escrow to the state directly.
      const handleEscrowCreated = () => {
        console.log('New Escrow Created, refetching list...');
        fetchEscrows();
      };
      factoryContract.on('EscrowCreated', handleEscrowCreated);
      return () => factoryContract.off('EscrowCreated', handleEscrowCreated);
    }
  }, [factoryContract, provider, fetchEscrows]);

  const value = {
    account,
    provider,
    signer,
    escrows,
    loading,
    connectWallet,
    createEscrow,
    fetchEscrows,
    getEscrowContract,
    approveToken,
    getAllowance,
    isConnected: !!account,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
