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
- **Testing**: Mocha, Chai, Waffle
- **Development**: Hardhat Network

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask browser extension
- Hardhat

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/decentralized-escrow-dapp.git
cd decentralized-escrow-dapp
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Start local development blockchain

In a new terminal, run:

```bash
npx hardhat node
```

### 4. Deploy the smart contract

In a new terminal, run:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Start the frontend

In a new terminal, run:

```bash
cd frontend
npm start
```

The application should now be running at `http://localhost:3000`.

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
