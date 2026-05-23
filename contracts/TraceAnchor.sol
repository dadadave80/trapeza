// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TraceAnchor
/// @notice Pins SHA-256 hashes of Trapeza agent reasoning traces onchain so
///         every decision is independently verifiable. One slot per hash.
contract TraceAnchor {
    event Anchored(bytes32 indexed traceHash, address indexed anchoredBy, uint256 timestamp);

    mapping(bytes32 => uint256) public anchoredAt;

    function anchor(bytes32 traceHash) external {
        require(anchoredAt[traceHash] == 0, "already anchored");
        anchoredAt[traceHash] = block.timestamp;
        emit Anchored(traceHash, msg.sender, block.timestamp);
    }

    function isAnchored(bytes32 traceHash) external view returns (bool) {
        return anchoredAt[traceHash] != 0;
    }
}
