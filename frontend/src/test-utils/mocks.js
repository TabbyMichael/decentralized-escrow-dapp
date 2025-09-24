import { jest } from '@jest/globals';

export const mockWeb3Context = {
  account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // A mock account address
  provider: null,
  signer: null,
  factoryContract: null,
  escrows: [],
  loading: false,
  isConnected: true,
  connectWallet: jest.fn(),
  createEscrow: jest.fn().mockResolvedValue({ success: true, address: '0x0123456789012345678901234567890123456789' }),
  fetchEscrows: jest.fn(),
  getEscrowContract: jest.fn(() => ({
    // Mocked escrow contract instance
    buyer: jest.fn().mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
    seller: jest.fn().mockResolvedValue('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
    arbiter: jest.fn().mockResolvedValue('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'),
    getState: jest.fn().mockResolvedValue('AWAITING_PAYMENT'),
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'), // 1 ETH in wei
    on: jest.fn(),
    off: jest.fn(),
  })),
};
