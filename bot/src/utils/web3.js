const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const FlashLoanArbitrage = require('../../../artifacts/contracts/FlashLoanArbitrage.sol/FlashLoanArbitrage.json');

const arbitrageContract = new ethers.Contract(
    process.env.ARBITRAGE_CONTRACT_ADDRESS,
    FlashLoanArbitrage.abi,
    wallet
);

// Add DEX router contracts
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