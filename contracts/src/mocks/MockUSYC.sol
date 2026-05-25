// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "solady/tokens/ERC20.sol";
import {ERC4626} from "solady/tokens/ERC4626.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

interface IOpenMintable {
    function mint(address to, uint256 amount) external;
}

/// @notice Hackathon mock of Circle's USYC (tokenized money market). Sits on
///         top of MockUSDC and pays a constant ~10% APY, time-accrued. The
///         vault is kept solvent by minting fresh underlying on each accrual,
///         which works only because MockUSDC has an open `mint`.
contract MockUSYC is ERC4626 {
    /// @dev 10% APY, in basis points (1000 bps = 10%).
    uint256 internal constant APY_BPS = 1000;
    uint256 internal constant YEAR = 365 days;
    uint256 internal constant BPS_BASE = 10_000;

    address private immutable _asset;

    uint256 public lastAccrualTimestamp;
    uint256 public accruedYield;

    constructor(address asset_) {
        _asset = asset_;
        lastAccrualTimestamp = block.timestamp;
    }

    function name() public pure override returns (string memory) {
        return "Mock US Yield Coin";
    }

    function symbol() public pure override returns (string memory) {
        return "USYC";
    }

    function asset() public view override returns (address) {
        return _asset;
    }

    function _underlyingDecimals() internal pure override returns (uint8) {
        return 6;
    }

    /// @dev Includes pending (not-yet-minted) yield so the share/asset ratio
    ///      reflects the true value of a USYC share at any moment.
    function totalAssets() public view override returns (uint256) {
        return SafeTransferLib.balanceOf(_asset, address(this)) + pendingYield();
    }

    /// @notice Yield that would be minted if `_accrue` ran right now.
    function pendingYield() public view returns (uint256) {
        uint256 principal = SafeTransferLib.balanceOf(_asset, address(this));
        if (principal == 0) return 0;
        uint256 elapsed = block.timestamp - lastAccrualTimestamp;
        if (elapsed == 0) return 0;
        return (principal * APY_BPS * elapsed) / (YEAR * BPS_BASE);
    }

    /// @dev Mints the pending yield's worth of underlying into the vault and
    ///      resets the clock. Safe because MockUSDC has an open mint.
    function _accrue() internal {
        uint256 pending = pendingYield();
        if (pending > 0) {
            IOpenMintable(_asset).mint(address(this), pending);
            accruedYield += pending;
        }
        lastAccrualTimestamp = block.timestamp;
    }

    // Accrue BEFORE deposits/mints so the elapsed-time × principal math uses
    // the pre-deposit balance — otherwise a fresh deposit gets retroactively
    // credited with a full period of yield. _beforeWithdraw is sufficient on
    // the exit side because the burn happens after the hook.
    function deposit(uint256 assets, address to) public override returns (uint256 shares) {
        _accrue();
        return super.deposit(assets, to);
    }

    function mint(uint256 shares, address to) public override returns (uint256 assets) {
        _accrue();
        return super.mint(shares, to);
    }

    function _beforeWithdraw(uint256, uint256) internal override {
        _accrue();
    }

    /// @notice Demo helper — credits an extra `extraSeconds` of accrual as if
    ///         that much time had elapsed since the last accrual, then resets
    ///         the clock. Computes off the current principal so it never
    ///         underflows the timestamp. Only useful in testnet/demo contexts.
    function simulateYield(uint256 extraSeconds) external {
        uint256 principal = SafeTransferLib.balanceOf(_asset, address(this));
        if (principal > 0 && extraSeconds > 0) {
            uint256 extra = (principal * APY_BPS * extraSeconds) / (YEAR * BPS_BASE);
            if (extra > 0) {
                IOpenMintable(_asset).mint(address(this), extra);
                accruedYield += extra;
            }
        }
        lastAccrualTimestamp = block.timestamp;
    }
}
