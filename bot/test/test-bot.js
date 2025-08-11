const { ethers } = require('ethers');
const { arbitrageContract, uniswapRouter, sushiswapRouter } = require('../src/utils/web3');
const priceService = require('../src/services/priceService');
const arbitrageService = require('../src/services/arbitrageService'); // Change this line

async function testBot() {
    try {
        // Test price monitoring
        const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const amount = ethers.parseEther("1"); // 1 WETH

        const opportunity = await priceService.findArbitrageOpportunity(
            WETH,
            USDC,
            amount
        );


        if (opportunity.profitable) {
            // Use the imported instance directly, don't create a new one
            const result = await arbitrageService.executeArbitrage({
                buyDex: opportunity.buyDex,
                sellDex: opportunity.sellDex,
                tokenAddress: USDC,
                amount: opportunity.profitableAmount,
                expectedProfit: opportunity.expectedProfit
            });

            console.log("Arbitrage execution result:", result);
        } else {
            console.log("No profitable opportunity found");
        }

    } catch (error) {
        console.error("Error testing bot:", error);
        throw error;
    }
}

testBot()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });