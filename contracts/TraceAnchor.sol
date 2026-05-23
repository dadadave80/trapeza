// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

event Anchored(
    bytes32 indexed traceHash,
    address indexed anchoredBy,
    uint256 timestamp
);

error AlreadyAnchored();

/// @title TraceAnchor
/// @notice Pins SHA-256 hashes of Trapeza agent reasoning traces onchain so
///         every decision is independently verifiable. One slot per hash.
contract TraceAnchor {
    mapping(bytes32 => uint256) public anchoredAt;

    function anchor(bytes32 traceHash) external {
        if (anchoredAt[traceHash] != 0) revert AlreadyAnchored();
        anchoredAt[traceHash] = block.timestamp;
        emit Anchored(traceHash, msg.sender, block.timestamp);
    }

    function isAnchored(bytes32 traceHash) external view returns (bool) {
        return anchoredAt[traceHash] != 0;
    }
}
