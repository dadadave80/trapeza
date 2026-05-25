// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {MockSwap} from "../src/mocks/MockSwap.sol";

/// @notice Deploys MockSwap and patches the existing deployments/<chainId>.json
///         in place — leaves the four token addresses untouched so the
///         frontend's pinned addresses don't go stale.
contract DeployMockSwapScript is Script {
    using stdJson for string;

    function run() external {
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        string memory existing = vm.readFile(path);

        address usdc = existing.readAddress(".MockUSDC");
        address eurc = existing.readAddress(".MockEURC");
        address cirbtc = existing.readAddress(".MockCirBTC");
        address usyc = existing.readAddress(".MockUSYC");

        vm.startBroadcast();
        MockSwap router = new MockSwap();
        vm.stopBroadcast();

        console2.log("============================================================");
        console2.log("MOCKSWAP DEPLOYED (chainId:", block.chainid, ")");
        console2.log("------------------------------------------------------------");
        console2.log("MockSwap  :", address(router));
        console2.log("============================================================");

        _writeDeployments(usdc, eurc, cirbtc, usyc, address(router));
    }

    function _writeDeployments(
        address usdc,
        address eurc,
        address cirbtc,
        address usyc,
        address router
    ) internal {
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        string memory json = string.concat(
            "{\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "MockUSDC": "', vm.toString(usdc), '",\n',
            '  "MockEURC": "', vm.toString(eurc), '",\n',
            '  "MockCirBTC": "', vm.toString(cirbtc), '",\n',
            '  "MockUSYC": "', vm.toString(usyc), '",\n',
            '  "MockSwap": "', vm.toString(router), '"\n',
            "}\n"
        );
        vm.writeFile(path, json);
        console2.log("Patched", path);
    }
}
