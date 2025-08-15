// src/index.js
require('dotenv').config();
const { ethers } = require('ethers');
const { provider, arbitrageContract } = require('./utils/web3');
const priceService = require('./services/priceService');
const { findOptimalSize } = require('./opt/size-optimizer');
const { WETH, tokens } = require('../config/tokens');

class ArbitrageBot {
    constructor() {
        this.minProfitThreshold = ethers.parseEther(process.env.MIN_PROFIT_THRESHOLD || '0.005');
        this.supportedDexes = ['uniswap', 'sushiswap'];
    }

    async checkAndExecute(tokenSymbol) {
        const tokenData = tokens.find(t => t.symbol === tokenSymbol);
        if (!tokenData) throw new Error(`Token ${tokenSymbol} not found`);

        const tokenAddress = tokenData.address;

        // Only execute between Uniswap <-> SushiSwap
        const pairs = [['uniswap', 'sushiswap'], ['sushiswap', 'uniswap']];

        for (const [buyDex, sellDex] of pairs) {
            if (!this.supportedDexes.includes(buyDex) || !this.supportedDexes.includes(sellDex)) continue;

            const { quoteBuy, quoteSell } = priceService.getQuoteFns({ buyDex, sellDex, tokenAddress });

            // Estimate gas cost
            const feeData = await provider.getFeeData();
            const maxFeePerGas = feeData.maxFeePerGas ?? ethers.parseUnits('40', 'gwei');
            const assumedGas = 450_000n;
            const gasCostWei = assumedGas * BigInt(maxFeePerGas.toString());

            // Determine min/max input for optimizer
            const minIn = ethers.parseEther('0.02');
            const maxIn = ethers.parseEther('10');

            const opt = await findOptimalSize({
                minIn,
                maxIn,
                quoteBuy,
                quoteSell,
                gasCostWei,
                maxIterations: 40n,
                segments: 4096n,
                finalPoints: 41n
            });

            if (opt.profit <= 0n || opt.sizeIn === 0n) continue;
            if (opt.profit < this.minProfitThreshold) continue;

            console.log(`Arbitrage opportunity: Buy ${buyDex}, Sell ${sellDex}, Profit: ${ethers.formatEther(opt.profit)} ETH, Size: ${ethers.formatEther(opt.sizeIn)} ETH`);

            // Encode params for flash loan
            const abiCoder = new ethers.AbiCoder();
            const dexToBuyId = buyDex === 'uniswap' ? 0 : 1;
            const encodedParams = abiCoder.encode(
                ['uint8', 'address', 'address', 'uint24', 'uint256'],
                [dexToBuyId, WETH, tokenAddress, 3000, opt.profit]
            );

            try {
                const tx = await arbitrageContract.requestFlashLoan(
                    WETH,
                    opt.sizeIn,
                    encodedParams,
                    {
                        gasLimit: BigInt(process.env.GAS_LIMIT || '550000'),
                        maxFeePerGas,
                        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei')
                    }
                );

                const receipt = await tx.wait();
                console.log(`Transaction executed. Hash: ${receipt.transactionHash}`);
            } catch (err) {
                console.error(`Failed to execute flash loan: ${err.message}`);
            }
        }
    }

    async run() {
        for (const token of tokens) {
            try {
                await this.checkAndExecute(token.symbol);
            } catch (err) {
                console.error(`Error processing ${token.symbol}:`, err.message);
            }
        }
    }
}

module.exports = ArbitrageBot;

// Usage example
// const bot = new ArbitrageBot();
// bot.run();
