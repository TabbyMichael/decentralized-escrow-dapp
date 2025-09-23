import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import EscrowFactory from '../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';

const Web3Context = createContext();

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
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        const accounts = await provider.send("eth_requestAccounts", []);
        const currentSigner = await provider.getSigner();
        setSigner(currentSigner);

        const currentAccount = accounts[0];
        setAccount(currentAccount);

        const factory = new ethers.Contract(factoryAddress, EscrowFactory.abi, currentSigner);
        setFactoryContract(factory);

        window.ethereum.on('accountsChanged', (newAccounts) => {
          setAccount(newAccounts[0] || '');
          window.location.reload();
        });

      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      alert("Please install MetaMask to use this DApp.");
    }
  }, [factoryAddress]);

  const fetchEscrows = useCallback(async () => {
    if (!factoryContract || !provider) return;
    setLoading(true);
    try {
      const escrowAddresses = await factoryContract.getDeployedEscrows();
      const escrowsData = await Promise.all(
        escrowAddresses.map(async (address) => {
          const escrowContract = new ethers.Contract(address, Escrow.abi, provider);
          const [buyer, seller, arbiter, state] = await Promise.all([
            escrowContract.buyer(),
            escrowContract.seller(),
            escrowContract.arbiter(),
            escrowContract.getState()
          ]);
          return { address, buyer, seller, arbiter, state };
        })
      );
      setEscrows(escrowsData.reverse());
    } catch (error) {
      console.error("Error fetching escrows:", error);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, provider]);

  const createEscrow = async (seller, arbiter) => {
    if (!factoryContract) throw new Error("Factory contract not initialized");
    try {
      const tx = await factoryContract.createEscrow(seller, arbiter);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'EscrowCreated');
      if (!event) throw new Error("EscrowCreated event not found");
      await fetchEscrows();
      return { success: true, address: event.args.escrowAddress };
    } catch (error) {
      console.error("Error creating escrow:", error);
      return { success: false, error: error.message };
    }
  };

  const getEscrowContract = useCallback((escrowAddress) => {
    if (!signer) return null;
    return new ethers.Contract(escrowAddress, Escrow.abi, signer);
  }, [signer]);

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  useEffect(() => {
    if (factoryContract) {
      fetchEscrows();
      const onEscrowCreated = () => fetchEscrows();
      factoryContract.on('EscrowCreated', onEscrowCreated);
      return () => factoryContract.off('EscrowCreated', onEscrowCreated);
    }
  }, [factoryContract, fetchEscrows]);

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
    isConnected: !!account,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
