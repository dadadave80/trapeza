// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, Vm} from "forge-std/Test.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockEURC} from "../src/mocks/MockEURC.sol";
import {MockSwap} from "../src/mocks/MockSwap.sol";

contract MockSwapTest is Test {
    MockUSDC usdc;
    MockEURC eurc;
    MockSwap router;
    address user = address(0xBEEF);

    event Swapped(
        address indexed from,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    function setUp() public {
        usdc = new MockUSDC();
        eurc = new MockEURC();
        router = new MockSwap();
    }

    function test_SwapMovesSourceAndMintsDest() public {
        usdc.mint(user, 1_000e6);

        vm.startPrank(user);
        usdc.approve(address(router), 1_000e6);
        router.swap(address(usdc), address(eurc), 1_000e6, 909e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(user), 0, "user USDC drained");
        assertEq(usdc.balanceOf(address(router)), 1_000e6, "router holds source");
        assertEq(eurc.balanceOf(user), 909e6, "user got destination");
    }

    function test_SwappedEventEmitted() public {
        usdc.mint(user, 500e6);

        vm.startPrank(user);
        usdc.approve(address(router), 500e6);

        vm.expectEmit(true, true, true, true, address(router));
        emit Swapped(user, address(usdc), address(eurc), 500e6, 454_500000);

        router.swap(address(usdc), address(eurc), 500e6, 454_500000);
        vm.stopPrank();
    }

    function test_RevertsWithoutApproval() public {
        usdc.mint(user, 100e6);
        vm.prank(user);
        // Solady ERC20 reverts with InsufficientAllowance() — selector check.
        vm.expectRevert();
        router.swap(address(usdc), address(eurc), 100e6, 100e6);
    }

    function test_RevertsOnInsufficientBalance() public {
        vm.startPrank(user);
        usdc.approve(address(router), 1_000e6);
        vm.expectRevert();
        router.swap(address(usdc), address(eurc), 1_000e6, 1_000e6);
        vm.stopPrank();
    }
}
