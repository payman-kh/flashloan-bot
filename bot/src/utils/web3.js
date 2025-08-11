const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

// mainent
//const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
// testnet
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Explicitly specify the ABI
const FLASH_LOAN_ARBITRAGE_ABI = [
    "function requestFlashLoan(address asset, uint256 amount, bytes calldata params) external",
    "function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes calldata params) external returns (bool)",
    "function withdraw(address token) external",
    "function owner() view external returns (address)"
];

const arbitrageContract = new ethers.Contract(
    process.env.ARBITRAGE_CONTRACT_ADDRESS,
    FLASH_LOAN_ARBITRAGE_ABI,
    wallet
);

// Rest of the code remains the same
const uniswapRouter = new ethers.Contract(
    process.env.UNISWAP_V3_ROUTER,
    ['function exactInputSingle(tuple(address,address,uint24,address,uint256,uint256,uint256,uint160)) external payable returns (uint256)'],
    wallet
);

const sushiswapRouter = new ethers.Contract(
    process.env.SUSHISWAP_ROUTER,
    ['function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) external returns (uint256[] memory)'],
    wallet
);

module.exports = {
    provider,
    wallet,
    arbitrageContract,
    uniswapRouter,
    sushiswapRouter
};