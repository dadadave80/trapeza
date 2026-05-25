// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "solady/tokens/ERC20.sol";

/// @notice Hackathon mock of Circle's cirBTC. Hackathon spec pins 6 decimals
///         on all mocks (production cirBTC uses 8 — diverging here intentionally
///         so the frontend's USDC/EURC math doesn't need separate units paths).
contract MockCirBTC is ERC20 {
    function name() public pure override returns (string memory) {
        return "Mock cirBTC";
    }

    function symbol() public pure override returns (string memory) {
        return "cirBTC";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
