// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "solady/tokens/ERC20.sol";

/// @notice Hackathon mock of Circle's USDC. 6 decimals. Open faucet `mint`.
contract MockUSDC is ERC20 {
    function name() public pure override returns (string memory) {
        return "Mock USD Coin";
    }

    function symbol() public pure override returns (string memory) {
        return "USDC";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
