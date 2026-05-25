// Hand-typed `as const` slice of MockSwap.sol's ABI — single `swap` function
// plus the `Swapped` event for client-side indexing / arcscan filtering.
export const mockSwapAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Swapped",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "tokenIn", type: "address", indexed: true },
      { name: "tokenOut", type: "address", indexed: true },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
