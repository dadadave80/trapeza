// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "solady/tokens/ERC20.sol";

/// @notice Hackathon mock of Circle's EURC. 6 decimals. Open faucet `mint`.
contract MockEURC is ERC20 {
    function name() public pure override returns (string memory) {
        return "Mock Euro Coin";
    }

    function symbol() public pure override returns (string memory) {
        return "EURC";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
