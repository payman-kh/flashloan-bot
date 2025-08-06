const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanArbitrage", function () {
    // Constants for test tokens and addresses
    const AAVE_POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e"; // Mainnet
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const POOL_FEE = 3000; // 0.3%
    const MIN_PROFIT = ethers.parseEther("0.1"); // 0.1 ETH minimum profit

    let flashLoanArbitrage;
    let owner;
    let addr1;
    let weth;
    let usdc;

    before(async function () {
        // This runs before all tests
        [owner, addr1] = await ethers.getSigners();

        // Get contract factory and deploy
        const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
        flashLoanArbitrage = await FlashLoanArbitrage.deploy(AAVE_POOL_ADDRESSES_PROVIDER);
        await flashLoanArbitrage.waitForDeployment();

        // Get WETH and USDC contract instances
        weth = await ethers.getContractAt("IERC20", WETH);
        usdc = await ethers.getContractAt("IERC20", USDC);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await flashLoanArbitrage.owner()).to.equal(owner.address);
        });

        it("Should set the correct AAVE pool provider", async function () {
            expect(await flashLoanArbitrage.ADDRESSES_PROVIDER()).to.equal(AAVE_POOL_ADDRESSES_PROVIDER);
        });
    });

    describe("Flash Loan Request", function () {
        it("Should only allow owner to request flash loan", async function () {
            const params = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "address", "address", "uint24", "uint256"],
                [0, WETH, USDC, POOL_FEE, MIN_PROFIT]
            );

            await expect(
                flashLoanArbitrage.connect(addr1).requestFlashLoan(
                    WETH,
                    ethers.parseEther("10"),
                    params
                )
            ).to.be.revertedWith("Not owner");
        });

        it("Should emit correct events during successful arbitrage", async function () {
            // This test requires forking mainnet and having sufficient balance
            // You might want to skip this in normal testing
            const params = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint8", "address", "address", "uint24", "uint256"],
                [0, WETH, USDC, POOL_FEE, MIN_PROFIT]
            );

            // Expect the FlashLoanExecuted event
            await expect(
                flashLoanArbitrage.requestFlashLoan(
                    WETH,
                    ethers.parseEther("10"),
                    params
                )
            ).to.emit(flashLoanArbitrage, "FlashLoanExecuted");
        });
    });

    describe("Withdrawal", function () {
        it("Should allow owner to withdraw tokens", async function () {
            // First, we need to send some tokens to the contract
            // This is just a test, in reality, these would come from successful arbitrage
            const amount = ethers.parseEther("1");

            // Try to withdraw (should work for owner)
            await expect(flashLoanArbitrage.connect(owner).withdraw(WETH))
                .to.not.be.reverted;
        });

        it("Should prevent non-owners from withdrawing", async function () {
            await expect(
                flashLoanArbitrage.connect(addr1).withdraw(WETH)
            ).to.be.revertedWith("Not owner");
        });
    });
});