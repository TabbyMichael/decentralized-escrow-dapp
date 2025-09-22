# Decentralized Escrow DApp

A trustless escrow service built on Ethereum that allows secure transactions between buyers and sellers with an optional arbiter for dispute resolution.

## Features

- **Secure Escrow**: Funds are held in a smart contract until conditions are met
- **Multiple Roles**: Supports buyers, sellers, and arbiters
- **Dispute Resolution**: Optional arbiter can mediate in case of disputes
- **Non-custodial**: Users maintain control of their funds
- **Transparent**: All transactions are recorded on the blockchain

## Tech Stack

- **Frontend**: React, Chakra UI, Ethers.js
- **Smart Contracts**: Solidity, Hardhat
- **Testing**: Mocha, Chai, Hardhat Chai Matchers
- **Development**: Hardhat Network

## Prerequisites

- Node.js (v16 or later)
- npm
- MetaMask browser extension

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/TabbyMichael/decentralized-escrow-dapp.git
cd decentralized-escrow-dapp
```

### 2. Install dependencies

This project has dependencies in the root directory and in the `frontend` directory.

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Compile the smart contract

This will generate the contract artifacts and place them in `frontend/src/artifacts`.

```bash
npx hardhat compile
```

### 4. Start local development blockchain

In a new terminal, run:

```bash
npx hardhat node
```

This will start a local Hardhat Network instance and print a list of accounts with their private keys.

### 5. Deploy the smart contract

In a new terminal, run:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address from the output.

### 6. Update the contract address in the frontend

Open `frontend/src/context/Web3Context.js` and update the `escrowAddress` variable with the address you copied in the previous step.

### 7. Start the frontend

In a new terminal, run:

```bash
cd frontend
npm start
```

The application should now be running at `http://localhost:3000`.

## Interacting with the Frontend

1.  **Connect your wallet**: Click the "Connect Wallet" button and connect your MetaMask wallet. Make sure you are connected to the "Localhost 8545" network.
2.  **Import an account**: Import one of the accounts from the `npx hardhat node` output into your MetaMask. This will give you an account with test ETH to interact with the contract.
3.  **Deposit**: As the buyer, enter an amount in ETH and click "Deposit to Escrow".
4.  **Release/Refund**: As the buyer or arbiter, you can release the funds to the seller or refund the buyer.
5.  **Resolve Dispute**: As the arbiter, you can resolve a dispute and send the funds to either the buyer or the seller.

## Smart Contract Details

The `Escrow` smart contract has the following features:

- **Roles**: Buyer, Seller, and optional Arbiter
- **States**: 
  - `AWAITING_PAYMENT`: Initial state, waiting for buyer to deposit funds
  - `AWAITING_DELIVERY`: Funds are in escrow, waiting for buyer confirmation
  - `COMPLETE`: Funds released to seller
  - `REFUNDED`: Funds returned to buyer
  - `DISPUTED`: In dispute resolution

## Testing

Run the test suite with:

```bash
npx hardhat test
```

## Security

This project includes the following security features:
- Reentrancy protection
- Access control modifiers
- Input validation
- Secure withdrawal patterns

## License

This project is licensed under the MIT License.
