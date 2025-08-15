// src/services/priceService.js
const { ethers } = require('ethers');
const { provider } = require('../utils/web3');
const { WETH } = require('../../config/tokens');

// DEX addresses (mainnet)
const UNISWAP_V3_QUOTER_V2 = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
const SUSHI_V2_ROUTER      = '0xd9e1CE17f2641F24aE83637ab66a2CCA9C378B9F';
const BALANCER_VAULT        = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const CURVE_POOL_ADDRESS    = '0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51'; // Example: ETH/stable swap pool
const KYBER_ROUTER           = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

// Minimal ABIs
const QUOTER_V2_ABI = [
    'function quoteExactInputSingle((address,address,uint256,uint24,uint160)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
    'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)'
];

const BALANCER_ABI = [
    'function getPoolTokens(bytes32 poolId) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)',
    'function getSwaps(address tokenIn, address tokenOut, uint256 amount) external view returns (uint256 amountOut)'
];

const CURVE_ABI = [
    'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

const KYBER_ABI = [
    'function getExpectedRate(address src, address dest, uint256 srcQty) external view returns (uint256 expectedRate, uint256 slippageRate)'
];

class PriceService {
    constructor() {
        this.uniswap = new ethers.Contract(UNISWAP_V3_QUOTER_V2, QUOTER_V2_ABI, provider);
        this.sushi   = new ethers.Contract(SUSHI_V2_ROUTER, SUSHI_ROUTER_ABI, provider);
        this.balancer = new ethers.Contract(BALANCER_VAULT, BALANCER_ABI, provider);
        this.curve   = new ethers.Contract(CURVE_POOL_ADDRESS, CURVE_ABI, provider);
        this.kyber   = new ethers.Contract(KYBER_ROUTER, KYBER_ABI, provider);
    }

    getQuoteFns({ buyDex, sellDex, tokenAddress, buyPoolFee = 3000, sellPoolFee = 3000 }) {
        const buy = String(buyDex).toLowerCase();
        const sell = String(sellDex).toLowerCase();

        let quoteBuy, quoteSell;

        // ---- BUY LEG ----
        switch (buy) {
            case 'uniswap':
                quoteBuy = async (amountIn) => {
                    const params = { tokenIn: WETH, tokenOut: tokenAddress, amountIn, fee: buyPoolFee >>> 0, sqrtPriceLimitX96: 0n };
                    const [amountOut] = await this.uniswap.quoteExactInputSingle(params);
                    return BigInt(amountOut);
                };
                break;
            case 'sushiswap':
                quoteBuy = async (amountIn) => {
                    const path = [WETH, tokenAddress];
                    const amounts = await this.sushi.getAmountsOut(amountIn, path);
                    return BigInt(amounts[1]);
                };
                break;
            case 'balancer':
                quoteBuy = async (amountIn) => {
                    // Placeholder for Balancer buy
                    const amountOut = await this.balancer.getSwaps(WETH, tokenAddress, amountIn);
                    return BigInt(amountOut);
                };
                break;
            case 'curve':
                quoteBuy = async (amountIn) => {
                    const amountOut = await this.curve.get_dy(0, 1, amountIn);
                    return BigInt(amountOut);
                };
                break;
            case 'kyber':
                quoteBuy = async (amountIn) => {
                    const [expectedRate] = await this.kyber.getExpectedRate(WETH, tokenAddress, amountIn);
                    return BigInt(expectedRate);
                };
                break;
            default:
                quoteBuy = async () => { throw new Error(`Unsupported buy DEX: ${buyDex}`); };
        }

        // ---- SELL LEG ----
        switch (sell) {
            case 'uniswap':
                quoteSell = async (amountIn) => {
                    const params = { tokenIn: tokenAddress, tokenOut: WETH, amountIn, fee: sellPoolFee >>> 0, sqrtPriceLimitX96: 0n };
                    const [amountOut] = await this.uniswap.quoteExactInputSingle(params);
                    return BigInt(amountOut);
                };
                break;
            case 'sushiswap':
                quoteSell = async (amountIn) => {
                    const path = [tokenAddress, WETH];
                    const amounts = await this.sushi.getAmountsOut(amountIn, path);
                    return BigInt(amounts[1]);
                };
                break;
            case 'balancer':
                quoteSell = async (amountIn) => {
                    const amountOut = await this.balancer.getSwaps(tokenAddress, WETH, amountIn);
                    return BigInt(amountOut);
                };
                break;
            case 'curve':
                quoteSell = async (amountIn) => {
                    const amountOut = await this.curve.get_dy(1, 0, amountIn);
                    return BigInt(amountOut);
                };
                break;
            case 'kyber':
                quoteSell = async (amountIn) => {
                    const [expectedRate] = await this.kyber.getExpectedRate(tokenAddress, WETH, amountIn);
                    return BigInt(expectedRate);
                };
                break;
            default:
                quoteSell = async () => { throw new Error(`Unsupported sell DEX: ${sellDex}`); };
        }

        return { quoteBuy, quoteSell };
    }
}

module.exports = new PriceService();
