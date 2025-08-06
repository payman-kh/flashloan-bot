const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    try {
        console.log("Deploying FlashLoanArbitrage contract...");

        const poolAddressesProvider = process.env.AAVE_POOL_ADDRESSES_PROVIDER;
        console.log("Using AAVE Pool Addresses Provider:", poolAddressesProvider);

        if (!poolAddressesProvider) {
            throw new Error("AAVE_POOL_ADDRESSES_PROVIDER not set in .env file");
        }

        if (!ethers.isAddress(poolAddressesProvider)) {
            throw new Error("Invalid Pool Addresses Provider address");
        }

        // Get the contract factory
        const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");

        console.log("Initiating deployment...");
        const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
            poolAddressesProvider,
            {
                gasLimit: 5000000
            }
        );

        console.log("Waiting for deployment confirmation...");
        await flashLoanArbitrage.waitForDeployment();

        const address = await flashLoanArbitrage.getAddress();
        console.log("FlashLoanArbitrage deployed to:", address);
        console.log("\nUpdate your .env file with:");
        console.log(`ARBITRAGE_CONTRACT_ADDRESS=${address}`);
    } catch (error) {
        console.error("Detailed error information:");
        console.error(error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });