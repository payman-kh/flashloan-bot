const { ethers } = require('ethers');
const { arbitrageContract } = require('../utils/web3');
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
            // Encode the parameters for the flash loan
            const abiCoder = new ethers.AbiCoder();
            const encodedParams = abiCoder.encode(
                ['uint8', 'address', 'address', 'uint24', 'uint256'],
                [
                    buyDex === 'uniswap' ? 0 : 1,  // dexToBuy
                    WETH,                          // tokenIn
                    tokenAddress,                  // tokenOut
                    3000,                         // poolFee (0.3% for Uniswap V3)
                    expectedProfit                 // minProfit
                ]
            );

            // Call requestFlashLoan instead of executeArbitrage
            const tx = await arbitrageContract.requestFlashLoan(
                WETH,           // asset to borrow
                amount,         // amount to borrow
                encodedParams,  // encoded parameters
                {
                    gasLimit: process.env.GAS_LIMIT || 500000,
                    maxFeePerGas: ethers.parseUnits('50', 'gwei'),
                    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
                }
            );

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
}

module.exports = new ArbitrageService();