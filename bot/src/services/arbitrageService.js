const { ethers } = require('ethers');
const { arbitrageContract, wallet } = require('../utils/web3');
const { WETH } = require('../../config/tokens');

class ArbitrageService {
    constructor() {
        this.minProfitThreshold = ethers.parseEther(process.env.MIN_PROFIT_THRESHOLD || "0.1");
    }

    async executeArbitrage(params) {
        const {
            buyDex,
            sellDex,
            tokenAddress,
            amount,
            expectedProfit
        } = params;

        // Check if profit meets minimum threshold
        if (expectedProfit < this.minProfitThreshold) {
            throw new Error('Profit below minimum threshold');
        }

        try {
            // Prepare transaction parameters
            const tx = await arbitrageContract.executeArbitrage(
                buyDex === 'uniswap' ? 0 : 1, // dexIndex for buy
                sellDex === 'uniswap' ? 0 : 1, // dexIndex for sell
                WETH,                          // token to borrow (WETH)
                tokenAddress,                  // token to trade
                amount,                        // amount to trade
                {
                    gasLimit: process.env.GAS_LIMIT || 500000,
                    maxFeePerGas: ethers.parseUnits('50', 'gwei'),  // adjust as needed
                    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')  // adjust as needed
                }
            );

            // Wait for transaction confirmation
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice.toString()
            };

        } catch (error) {
            throw new Error(`Arbitrage execution failed: ${error.message}`);
        }
    }

    async estimateGas(params) {
        const {
            buyDex,
            sellDex,
            tokenAddress,
            amount
        } = params;

        try {
            const gasEstimate = await arbitrageContract.executeArbitrage.estimateGas(
                buyDex === 'uniswap' ? 0 : 1,
                sellDex === 'uniswap' ? 0 : 1,
                WETH,
                tokenAddress,
                amount
            );

            return gasEstimate;
        } catch (error) {
            throw new Error(`Gas estimation failed: ${error.message}`);
        }
    }

    calculateNetProfit(expectedProfit, gasEstimate, gasPrice) {
        const gasCost = gasEstimate.mul(gasPrice);
        return expectedProfit.sub(gasCost);
    }
}

module.exports = new ArbitrageService();