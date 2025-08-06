const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying FlashLoanArbitrage contract...");

    // Get the contract factory
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");

    // Deploy the contract
    // Add constructor parameters if your contract needs them
    const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        // Add constructor arguments here if needed
        // For example: AAVE_LENDING_POOL_ADDRESS
        process.env.AAVE_LENDING_POOL_ADDRESS
    );

    await flashLoanArbitrage.waitForDeployment();

    const address = await flashLoanArbitrage.getAddress();
    console.log("FlashLoanArbitrage deployed to:", address);

    // You might want to save this address to your .env file
    console.log("\nUpdate your .env file with this contract address!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });