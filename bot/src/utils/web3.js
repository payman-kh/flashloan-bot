// src/utils/web3.js
const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const FLASH_LOAN_ARBITRAGE_ABI = [
    'function requestFlashLoan(address asset, uint256 amount, bytes params) external',
    'function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes params) external returns (bool)',
    'function withdraw(address token) external',
    'function owner() view external returns (address)',
];

const arbitrageContract = new ethers.Contract(
    process.env.ARBITRAGE_CONTRACT_ADDRESS,
    FLASH_LOAN_ARBITRAGE_ABI,
    wallet
);

module.exports = {
    provider,
    wallet,
    arbitrageContract,
};
