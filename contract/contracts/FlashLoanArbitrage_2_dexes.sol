// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IFlashLoanSimpleReceiver} from "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface ISushiSwapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    address public owner;

    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant SUSHISWAP_ROUTER  = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    event FlashLoanExecuted(address asset, uint256 amount, uint256 premium);
    event SwapExecuted(string dex, address fromToken, address toToken, uint256 amountIn, uint256 amountOut);
    event ProfitCalculated(uint256 amountBack, uint256 amountOwed, int256 profit);
    event FlashLoanRepaid(address asset, uint256 totalRepaid);
    event ArbitrageFailed(string reason);


    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address providerAddress) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(providerAddress);
        POOL = IPool(ADDRESSES_PROVIDER.getPool());
        owner = msg.sender;
    }

    function requestFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner {
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL) && initiator == address(this), "Invalid caller");

        (uint8 dexToBuy, address tokenIn, address tokenOut, uint24 poolFee, uint256 minProfit) =
                            abi.decode(params, (uint8, address, address, uint24, uint256));

        require(tokenIn == asset, "Flash loan asset mismatch");

        // Handle first approval outside the if-else
        IERC20(tokenIn).approve(dexToBuy == 0 ? UNISWAP_V3_ROUTER : SUSHISWAP_ROUTER, amount);

        uint256 amountOut;
        uint256 amountBack;

        if (dexToBuy == 0) {
            // Buy on Uniswap, sell on SushiSwap
            amountOut = _swapOnUniswap(tokenIn, tokenOut, poolFee, amount, address(this));
            amountBack = _swapOnSushiSwap(tokenOut, tokenIn, amountOut);
        } else if (dexToBuy == 1) {
            // Buy on SushiSwap, sell on Uniswap
            amountOut = _swapOnSushiSwap(tokenIn, tokenOut, amount);
            amountBack = _swapOnUniswap(tokenOut, tokenIn, poolFee, amountOut, address(this));
        } else {
            revert("Invalid dexToBuy value");
        }

        uint256 totalOwed = amount + premium;
        require(amountBack >= totalOwed + minProfit, "No sufficient profit");

        IERC20(tokenIn).approve(address(POOL), totalOwed);

        return true;
    }

// Helper functions to reduce local variables in main function
    function _swapOnUniswap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        address recipient
    ) private returns (uint256) {
        uint256 amountOut = IUniswapV3Router(UNISWAP_V3_ROUTER).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                deadline: block.timestamp + 300,
                amountIn: amountIn,
                amountOutMinimum: 1,
                sqrtPriceLimitX96: 0
            })
        );
        emit SwapExecuted("UniswapV3", tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    function _swapOnSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) private returns (uint256) {
        IERC20(tokenIn).approve(SUSHISWAP_ROUTER, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint[] memory amounts = ISushiSwapRouter(SUSHISWAP_ROUTER).swapExactTokensForTokens(
            amountIn,
            1,
            path,
            address(this),
            block.timestamp + 300
        );

        emit SwapExecuted("SushiSwap", tokenIn, tokenOut, amountIn, amounts[1]);
        return amounts[1];
    }

    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, balance);
    }

    receive() external payable {}
}
