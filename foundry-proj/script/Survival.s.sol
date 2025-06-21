// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import "../src/SurvivalToken.sol";
import "../src/SurvivalContract.sol";

contract DeployScript is Script {
   function run() external {
       uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
       vm.startBroadcast(deployerPrivateKey);

       // 1. Deploy Token Contract
       SurvivalToken token = new SurvivalToken();
       console.log("SurvivalToken deployed at:", address(token));

       // 2. Deploy Survival Contract with token address
       SurvivalContract survival = new SurvivalContract(address(token));
       console.log("SurvivalContract deployed at:", address(survival));

       // 3. Set survival contract address in token contract
       token.setSurvivalContract(address(survival));
       console.log("Survival contract address set in token contract");

       vm.stopBroadcast();

       console.log("=== Deployment Summary ===");
       console.log("Token Contract:", address(token));
       console.log("Survival Contract:", address(survival));
   }
}