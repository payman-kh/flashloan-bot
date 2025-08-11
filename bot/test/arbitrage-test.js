const { ethers } = require('ethers');
const { tokens, WETH } = require('../config/tokens');
const priceService = require('../src/services/priceService');
const arbitrageService = require('../src/services/arbitrageService');
const { provider } = require('../src/utils/web3');

async function monitorAllPairs() {
    console.log('Starting arbitrage monitoring...');

    // Test amount (1 ETH)
    const amount = ethers.parseEther("1");

    // Monitor all tokens against WETH
    for (const token of tokens) {
        console.log(`\nChecking ${token.symbol}/WETH pair...`);

        try {
            const opportunity = await priceService.findArbitrageOpportunity(
                WETH,
                token.address,
                amount
            );

            if (opportunity.profitable) {
                console.log(`Found profitable opportunity for ${token.symbol}!`);
                console.log(`Buy on: ${opportunity.buyDex}`);
                console.log(`Sell on: ${opportunity.sellDex}`);
                console.log(`Expected profit: ${ethers.formatEther(opportunity.expectedProfit)} ETH`);

                try {
                    const result = await arbitrageService.executeArbitrage({
                        buyDex: opportunity.buyDex,
                        sellDex: opportunity.sellDex,
                        tokenAddress: token.address,
                        amount: opportunity.profitableAmount,
                        expectedProfit: opportunity.expectedProfit
                    });
                    console.log('Arbitrage execution result:', result);
                } catch (error) {
                    console.error('Failed to execute arbitrage:', error.message);
                }
            }
        } catch (error) {
            console.error(`Error checking ${token.symbol}:`, error.message);
        }
    }
}

async function simulatePriceChange() {
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    console.log('Current block:', currentBlock);

    // Mine some blocks to move forward in time
    await provider.send('hardhat_mine', ['0x100']); // Mine 256 blocks

    // Optionally, you can set the next bloGetting prices...
    // Uniswap price: 2306959638
    // Sushiswap price: 2306352097
    // Price difference (basis points): 2
    // Arbitrage analysis: {
    //   profitable: false,
    //   priceDifferenceBPS: '2',
    //   buyDex: 'sushiswap',
    //   sellDex: 'uniswap',
    //   profitableAmount: '0.0',
    //   expectedProfit: '0.0'
    // }
    // No profitable opportunity foundck's timestamp to simulate time passing
    const newTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in the future
    await provider.send('evm_setNextBlockTimestamp', [newTimestamp]);
    await provider.send('evm_mine');
}

async function runTests() {
    try {
        // Initial monitoring
        console.log('Initial market check...');
        await monitorAllPairs();

        // Simulate price changes
        console.log('\nSimulating market changes...');
        await simulatePriceChange();

        // Check again after simulated changes
        console.log('\nChecking market after simulated changes...');
        await monitorAllPairs();

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the tests
runTests()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });