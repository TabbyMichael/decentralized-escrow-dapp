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
      // The listener will automatically pick up the new escrow.
      const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'EscrowCreated');
      if (!event) {
        throw new Error("EscrowCreated event not found in transaction receipt");
      }
      return { success: true, address: event.args[0] }; // event.args[0] is the escrowAddress
    } catch (error) {
      console.error("Error creating escrow:", error);
      return { success: false, error };
    }
  };

  const getEscrowContract = useCallback((escrowAddress) => {
    if (!signer) return null;
    return new ethers.Contract(escrowAddress, Escrow.abi, signer);
  }, [signer]);

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  // Effect for fetching initial data and listening for new escrows
  useEffect(() => {
    if (factoryContract && provider) {
      fetchEscrows();

      const handleEscrowCreated = async (escrowAddress, buyer, seller) => {
        console.log(`New Escrow Created: ${escrowAddress}`);
        const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, provider);
        const arbiter = await escrowContract.arbiter();
        const newEscrow = {
          address: escrowAddress,
          buyer,
          seller,
          arbiter,
          state: 'AWAITING_PAYMENT',
        };
        setEscrows(prev => [newEscrow, ...prev]);
      };

      factoryContract.on('EscrowCreated', handleEscrowCreated);

      return () => {
        factoryContract.off('EscrowCreated', handleEscrowCreated);
      };
    }
  }, [factoryContract, provider, fetchEscrows]);

  // Effect for listening to events on individual escrow contracts
  useEffect(() => {
    if (provider && escrows.length > 0) {
      const handleStateChange = (escrowAddress, newState) => {
        setEscrows(prev =>
          prev.map(escrow =>
            escrow.address.toLowerCase() === escrowAddress.toLowerCase()
              ? { ...escrow, state: newState }
              : escrow
          )
        );
      };

      const contracts = escrows.map(e => new ethers.Contract(e.address, Escrow.abi, provider));

      contracts.forEach(contract => {
        const address = contract.target;
        contract.on('Deposited', () => handleStateChange(address, 'AWAITING_DELIVERY'));
        contract.on('ItemShipped', () => handleStateChange(address, 'SHIPPED'));
        contract.on('DisputeRaised', () => handleStateChange(address, 'DISPUTED'));
        contract.on('Released', () => handleStateChange(address, 'COMPLETE'));
        contract.on('Refunded', () => handleStateChange(address, 'REFUNDED'));
        contract.on('DisputeResolved', () => handleStateChange(address, 'RESOLVED'));
      });

      return () => {
        contracts.forEach(contract => contract.removeAllListeners());
      };
    }
  }, [escrows, provider]);

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
