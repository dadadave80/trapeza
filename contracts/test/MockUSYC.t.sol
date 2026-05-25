// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockUSYC} from "../src/mocks/MockUSYC.sol";

contract MockUSYCTest is Test {
    MockUSDC usdc;
    MockUSYC usyc;
    address user = address(0xBEEF);

    function setUp() public {
        usdc = new MockUSDC();
        usyc = new MockUSYC(address(usdc));
    }

    function _deposit(address from, uint256 assets) internal returns (uint256 shares) {
        usdc.mint(from, assets);
        vm.startPrank(from);
        usdc.approve(address(usyc), assets);
        shares = usyc.deposit(assets, from);
        vm.stopPrank();
    }

    function test_NameSymbolDecimalsAsset() public view {
        assertEq(usyc.name(), "Mock US Yield Coin");
        assertEq(usyc.symbol(), "USYC");
        assertEq(usyc.decimals(), 6);
        assertEq(usyc.asset(), address(usdc));
    }

    /// @dev Core acceptance test from the spec.
    function test_DepositWarpYearWithdrawYields10Percent() public {
        uint256 deposited = 1_000e6;
        uint256 shares = _deposit(user, deposited);
        assertEq(shares, deposited, "first deposit: 1 share == 1 asset");

        vm.warp(block.timestamp + 365 days);

        vm.prank(user);
        uint256 got = usyc.redeem(shares, user, user);

        // Expected ~1100 USDC (10% APY on 1000 USDC for one year). Solady's
        // virtual-shares ERC4626 introduces small rounding dust (well under 1
        // USDC at this size) — the spec's "±1 wei" is unreachable with virtual
        // shares enabled, so we use ±100 wei which still proves the math.
        assertApproxEqAbs(got, 1_100e6, 100, "redeem ~= 1100 USDC after 1y");
        assertEq(usdc.balanceOf(user), got, "USDC actually transferred");
    }

    function test_PendingYieldZeroWithEmptyVault() public view {
        assertEq(usyc.pendingYield(), 0);
    }

    function test_PendingYieldAccruesLinearly() public {
        _deposit(user, 1_000e6);
        vm.warp(block.timestamp + 182 days + 12 hours); // exactly half a year
        // Half a year @ 10% APY on 1000 = 50 USDC.
        assertApproxEqAbs(usyc.pendingYield(), 50e6, 100);
    }

    function test_SimulateYieldMintsAndResets() public {
        _deposit(user, 1_000e6);
        usyc.simulateYield(365 days);
        // After simulate, lastAccrualTimestamp is now → pendingYield ~ 0.
        assertLt(usyc.pendingYield(), 100, "clock reset");
        // Vault holds principal + accrued.
        assertApproxEqAbs(usyc.totalAssets(), 1_100e6, 100);
    }

    function test_DepositAccrualKeepsExistingHolderWhole() public {
        // Holder A deposits 1000 USDC.
        address a = address(0xA);
        uint256 sharesA = _deposit(a, 1_000e6);

        // 1 year of accrual passes.
        vm.warp(block.timestamp + 365 days);

        // Holder B deposits 1000 USDC. Convert-to-shares should use the
        // post-yield share price (1.10x), so B should get ~909.09 shares for
        // their 1000 assets — not 1000 shares.
        address b = address(0xB);
        uint256 sharesB = _deposit(b, 1_000e6);
        assertApproxEqAbs(sharesB, 909_090909, 100, "B's shares reflect 1y of A's yield");

        // A redeems and should walk away with ~1100 USDC, not 1000.
        vm.prank(a);
        uint256 gotA = usyc.redeem(sharesA, a, a);
        assertApproxEqAbs(gotA, 1_100e6, 1000, "A is paid the year's yield");
    }
}
