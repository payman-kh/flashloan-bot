const { ethers } = require('ethers');
const { provider } = require('../utils/web3');
const IUniswapV3Pool = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const IUniswapV3Factory = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json');
const ISushiswapPair = require('@uniswap/v2-core/build/IUniswapV2Pair.json');
const ISushiswapFactory = require('@uniswap/v2-core/build/IUniswapV2Factory.json');

class PriceService {
    constructor() {
        this.uniswapFactory = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
        this.sushiswapFactory = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac';
    }

    async getPriceFromUniswap(tokenA, tokenB, amount) {
        try {
            const factory = new ethers.Contract(this.uniswapFactory, IUniswapV3Factory.abi, provider);
            const poolAddress = await factory.getPool(tokenA, tokenB, 3000); // 0.3% fee tier

            if (poolAddress === '0x0000000000000000000000000000000000000000') {
                console.log('Uniswap pool does not exist');
                return BigInt(0);
            }

            const pool = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, provider);
            const [token0, token1] = await Promise.all([
                pool.token0(),
                pool.token1()
            ]);

            const slot0 = await pool.slot0();
            const sqrtPriceX96 = slot0.sqrtPriceX96;

            // Convert sqrtPriceX96 to actual price
            const price = (sqrtPriceX96 * sqrtPriceX96 * BigInt(1e18)) / (BigInt(2) ** BigInt(192));
            return token0.toLowerCase() === tokenA.toLowerCase() ? price : (BigInt(1e36) / price);

        } catch (error) {
            console.error('Error getting Uniswap price:', error);
            return BigInt(0);
        }
    }

    async getPriceFromSushiswap(tokenA, tokenB, amount) {
        try {
            const factory = new ethers.Contract(this.sushiswapFactory, ISushiswapFactory.abi, provider);
            const pairAddress = await factory.getPair(tokenA, tokenB);

            if (pairAddress === '0x0000000000000000000000000000000000000000') {
                console.log('Sushiswap pair does not exist');
                return BigInt(0);
            }

            const pair = new ethers.Contract(pairAddress, ISushiswapPair.abi, provider);
            const [reserves, token0] = await Promise.all([
                pair.getReserves(),
                pair.token0()
            ]);

            const [reserve0, reserve1] = [reserves[0], reserves[1]];

            // Calculate price based on reserves
            if (token0.toLowerCase() === tokenA.toLowerCase()) {
                return (BigInt(reserve1) * BigInt(1e18)) / BigInt(reserve0);
            } else {
                return (BigInt(reserve0) * BigInt(1e18)) / BigInt(reserve1);
            }

        } catch (error) {
            console.error('Error getting Sushiswap price:', error);
            return BigInt(0);
        }
    }

    async findArbitrageOpportunity(tokenA, tokenB, amount) {
        console.log('Getting prices...');
        const [uniswapPrice, sushiswapPrice] = await Promise.all([
            this.getPriceFromUniswap(tokenA, tokenB, amount),
            this.getPriceFromSushiswap(tokenA, tokenB, amount)
        ]);

        console.log('Uniswap price:', uniswapPrice.toString());
        console.log('Sushiswap price:', sushiswapPrice.toString());

        if (uniswapPrice === BigInt(0) || sushiswapPrice === BigInt(0)) {
            return {
                profitable: false,
                buyDex: '',
                sellDex: '',
                profitableAmount: BigInt(0),
                expectedProfit: BigInt(0)
            };
        }

        // Calculate price difference in basis points (1 bp = 0.01%)
        const priceDiff = uniswapPrice > sushiswapPrice
            ? ((uniswapPrice - sushiswapPrice) * BigInt(10000)) / sushiswapPrice
            : ((sushiswapPrice - uniswapPrice) * BigInt(10000)) / uniswapPrice;

        console.log('Price difference (basis points):', priceDiff.toString());

        const MIN_PROFIT_BPS = BigInt(50); // 0.5%
        const profitable = priceDiff > MIN_PROFIT_BPS;

        // Set the amount we want to trade if profitable
        const profitableAmount = profitable ? ethers.parseEther("0.1") : BigInt(0); // 0.1 ETH if profitable

        const result = {
            profitable,
            buyDex: uniswapPrice > sushiswapPrice ? 'sushiswap' : 'uniswap',
            sellDex: uniswapPrice > sushiswapPrice ? 'uniswap' : 'sushiswap',
            profitableAmount,
            expectedProfit: profitable ? (profitableAmount * priceDiff) / BigInt(10000) : BigInt(0)
        };

        // Only log once
        console.log(`Arbitrage analysis:`, {
            profitable: result.profitable,
            priceDifferenceBPS: priceDiff.toString(),
            buyDex: result.buyDex,
            sellDex: result.sellDex,
            profitableAmount: ethers.formatEther(result.profitableAmount),
            expectedProfit: ethers.formatEther(result.expectedProfit)
        });

        return result;
    }
}

module.exports = new PriceService();