// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IERC20Like {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IOpenMintable {
    function mint(address to, uint256 amount) external;
}

/// @notice Hackathon mock swap router. Pulls `amountIn` of `tokenIn` from the
///         caller (caller must approve first) and mints `amountOut` of
///         `tokenOut` back to them. Not a real DEX — `amountOut` is trusted
///         from the caller, who is expected to derive it from an offchain
///         price oracle. Only works against tokens with an open `mint`.
///
///         The point of having a router (vs. doing transfer-to-sink + mint
///         directly from the agent) is the single onchain `Swapped` event
///         per leg — clean to index and clean to show on arcscan.
contract MockSwap {
    event Swapped(
        address indexed from,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) external {
        // Solady's transferFrom reverts on failure, so the bool is academic,
        // but we check it anyway to satisfy the lint and survive a future
        // swap-in of a non-reverting ERC20.
        bool ok = IERC20Like(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        require(ok, "MockSwap: transferFrom failed");
        IOpenMintable(tokenOut).mint(msg.sender, amountOut);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
