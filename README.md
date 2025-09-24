<div align="center">
  <h1>🔒 Decentralized Escrow DApp</h1>
  <p>A trustless escrow service on Ethereum with multi-role support and dispute resolution</p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Solidity](https://img.shields.io/badge/Solidity-0.8.19-3C3C3D?logo=solidity)](https://soliditylang.org/)
  [![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
  [![Hardhat](https://img.shields.io/badge/Hardhat-2.12.0-FFF100?logo=ethereum)](https://hardhat.org/)
  [![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.8.0-319795?logo=chakraui)](https://chakra-ui.com/)
</div>

## 📋 Table of Contents
- [✨ Features](#-features)
- [⚠️ Key Considerations](#%EF%B8%8F-key-considerations)
- [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

- **Secure & Trustless**
  - Smart contract holds funds securely on the Ethereum blockchain
  - No need to trust a third-party intermediary

- **Role-Based Access Control**
  - Clear on-chain roles: Buyer, Seller, and optional Arbiter
  - Customizable permissions for each role

- **Factory Pattern**
  - Deploys a new `Escrow` contract for each agreement, managed by a central `EscrowFactory`.
  - Scalable and cost-effective for managing multiple escrows.

- **Robust State Management**
  - Clear state machine: `AWAITING_PAYMENT` → `AWAITING_DELIVERY` → `SHIPPED` → `COMPLETE`/`REFUNDED`/`RESOLVED`
  - Includes seller-specific actions (`confirmShipment`) to advance the escrow state.

- **Secure Dispute and Refund Process**
  - A formal dispute can be raised by the buyer or seller.
  - Only the arbiter can resolve disputes or issue refunds, preventing unilateral actions.

## ⚠️ Key Considerations

- **Dependency Management**
  - Uses specific versions of `@chakra-ui/react` (v1) for stability
  - ES Modules configuration requires `import/export` syntax in all JavaScript files
  - Artifacts are output to `frontend/src/artifacts` for frontend access

- **Development Environment**
  - Requires Node.js v16+
  - Uses Hardhat for local development and testing
  - Includes comprehensive test coverage

## 🛠️ Tech Stack

| Category            | Technologies                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **Blockchain**      | Solidity (0.8.19), Ethereum                                                 |
| **Development**     | Hardhat (v2.12.0), Ethers.js (v6.6.2)                                       |
| **Frontend**        | React (18.2.0), Chakra UI (1.8.8), web3-react (6.1.9), React Router (6.x) |
| **Testing**         | Mocha, Chai, hardhat-chai-matchers                                          |
| **Tools**           | MetaMask, Git, npm                                                          |

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- npm (v7+)
- MetaMask browser extension

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/TabbyMichael/decentralized-escrow-dapp.git
   cd decentralized-escrow-dapp
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Compile contracts**
   ```bash
   npx hardhat compile
   ```

4. **Start local blockchain** (in a new terminal)
   ```bash
   npx hardhat node
   ```

5. **Deploy the factory contract** (in a new terminal)
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
   Copy the deployed `EscrowFactory` contract address from the output and paste it into `frontend/.env` as the value for `REACT_APP_FACTORY_ADDRESS`.

6. **Run the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm start
   ```
   The application will be running at `http://localhost:3000`.

### Interacting with the Factory

To create a new escrow, you can use the Hardhat console.

1. **Start the console**
   ```bash
   npx hardhat console --network localhost
   ```

2. **Connect to the Factory and Create an Escrow**
   ```javascript
   // The address of your deployed factory
   const factoryAddress = "YOUR_FACTORY_ADDRESS";

   // Get signers (e.g., buyer, seller, arbiter)
   const [buyer, seller, arbiter] = await ethers.getSigners();

   // Attach to the factory contract
   const factory = await ethers.getContractAt("EscrowFactory", factoryAddress);

   // The 'buyer' creates a new escrow with 'seller' and 'arbiter'
   await factory.connect(buyer).createEscrow(seller.address, arbiter.address);

   // Get the address of the newly created escrow
   const deployedEscrows = await factory.getDeployedEscrows();
   const newEscrowAddress = deployedEscrows[deployedEscrows.length - 1];
   console.log(`New escrow created at: ${newEscrowAddress}`);
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_here
ALCHEMY_API_KEY=your_alchemy_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Network Configuration
Edit `hardhat.config.js` to add or modify network configurations:

```javascript
module.exports = {
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## 🧪 Testing

Run the complete test suite:
```bash
npx hardhat test
```

Run tests with gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

## 🚢 Deployment

### 1. Deploy to Testnet/Mainnet
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 2. Verify on Etherscan
```bash
npx hardhat verify --network sepolia DEPLOYED_FACTORY_ADDRESS
```

### 3. Deploy Frontend
```bash
cd frontend
npm run build
```
Deploy the `build` directory to your preferred hosting service (Vercel, Netlify, etc.).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to update tests as appropriate.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure contract patterns
- [Hardhat](https://hardhat.org/) for the development environment
- [Chakra UI](https://chakra-ui.com/) for the component library
- [Ethers.js](https://docs.ethers.org/) for blockchain interactions
