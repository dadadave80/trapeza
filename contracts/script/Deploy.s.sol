// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockEURC} from "../src/mocks/MockEURC.sol";
import {MockCirBTC} from "../src/mocks/MockCirBTC.sol";
import {MockUSYC} from "../src/mocks/MockUSYC.sol";

/// @notice Deploys the four hackathon mocks and writes the addresses to
///         deployments/<chainId>.json so the frontend has a canonical source
///         of truth without manual copy-paste.
contract DeployScript is Script {
    uint256 internal constant SEED_AMOUNT = 10_000 * 1e6; // 10,000 USDC

    function run() external {
        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        MockEURC eurc = new MockEURC();
        MockCirBTC cirbtc = new MockCirBTC();
        MockUSYC usyc = new MockUSYC(address(usdc));

        address deployer = msg.sender;

        usdc.mint(deployer, SEED_AMOUNT);
        usdc.approve(address(usyc), SEED_AMOUNT);
        uint256 shares = usyc.deposit(SEED_AMOUNT, deployer);

        vm.stopBroadcast();

        console2.log("============================================================");
        console2.log("DEPLOYED ADDRESSES (chainId:", block.chainid, ")");
        console2.log("------------------------------------------------------------");
        console2.log("MockUSDC  :", address(usdc));
        console2.log("MockEURC  :", address(eurc));
        console2.log("MockCirBTC:", address(cirbtc));
        console2.log("MockUSYC  :", address(usyc), "(asset = MockUSDC)");
        console2.log("============================================================");

        console2.log("============================================================");
        console2.log("SETUP COMPLETE");
        console2.log("------------------------------------------------------------");
        console2.log("USYC seed deposit by  :", deployer);
        console2.log("USDC deposited (raw)  :", SEED_AMOUNT);
        console2.log("USYC shares received  :", shares);
        console2.log("USYC totalAssets()    :", usyc.totalAssets());
        console2.log("USYC totalSupply()    :", usyc.totalSupply());
        console2.log("============================================================");

        _writeDeployments(address(usdc), address(eurc), address(cirbtc), address(usyc));
    }

    function _writeDeployments(address usdc, address eurc, address cirbtc, address usyc) internal {
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        string memory json = string.concat(
            "{\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "MockUSDC": "', vm.toString(usdc), '",\n',
            '  "MockEURC": "', vm.toString(eurc), '",\n',
            '  "MockCirBTC": "', vm.toString(cirbtc), '",\n',
            '  "MockUSYC": "', vm.toString(usyc), '"\n',
            "}\n"
        );
        vm.writeFile(path, json);
        console2.log("Wrote", path);
    }
}
