// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


interface ISurvivalToken is IERC20 {
    function mintAndApproveSurvivalContract(
        address player,
        uint256 amount
    ) external;
}

contract SurvivalContract  {

    using Strings for uint256;

    error AlreadyRegistered();
    error InsufficientEther();
    error GameNotActive();

    address public owner;
    uint public totalPlayerCount;
    ISurvivalToken public survivalTokenContract;

    mapping(address => GameConfigForPlayer) public addressToGameConfig;
    mapping(address => bool) public registered;

    uint constant gameFee = 10 ether;

    struct GameConfigForPlayer {
        address playerAddress;
        uint detonateAllIndex;
        uint randomness;
        uint ai1Decision; // 0 = pass, 1 = detonate
        uint ai2Decision;
        uint ai3Decision;
        bool gameActive;
        uint playerPosition;
    }

    constructor(address _tokenAddress) {
        owner = msg.sender;
        survivalTokenContract = ISurvivalToken(_tokenAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier directCallsOnly() {
        require(tx.origin == msg.sender, "Direct calls only");
        _;
    }

    function registerPlayer() external payable {
        if (msg.value < 0.01 ether) {
            revert InsufficientEther();
        }
        if (registered[msg.sender]) {
            revert AlreadyRegistered();
        }
        registered[msg.sender] = true;
        totalPlayerCount++;
        survivalTokenContract.mintAndApproveSurvivalContract(
            msg.sender,
            200 ether
        );
    }

function startGame(uint8 position) external directCallsOnly returns (bool gameEnded, bool won, string memory result) {
       require(position < 4, "Invalid position");
       require(registered[msg.sender], "Not registered");
       require(!addressToGameConfig[msg.sender].gameActive, "Game already active");

       survivalTokenContract.transferFrom(msg.sender, address(this), gameFee);

        uint256 baseRandom = 123456789;
        //uint256 baseRandom = uint256(block.prevrandao); // Use TEN's secure randomness

       GameConfigForPlayer storage config = addressToGameConfig[msg.sender];
       config.playerAddress = msg.sender;
       config.randomness = baseRandom;
       config.detonateAllIndex = baseRandom % 4;
       config.ai1Decision = (baseRandom >> 8) % 2;
       config.ai2Decision = (baseRandom >> 16) % 2;
       config.ai3Decision = (baseRandom >> 24) % 2;
       config.gameActive = true;
       config.playerPosition = position;

       // Check if any AI before player's position detonates
       uint[3] memory aiDecisions = [config.ai1Decision, config.ai2Decision, config.ai3Decision];
       uint aiIndex = 0;
       
       for (uint i = 0; i < position; i++) {
           if (i == config.detonateAllIndex && aiDecisions[aiIndex] == 1) {
               // AI detonated before player's turn - game ends immediately
               config.gameActive = false;
               return (true, false, string(abi.encodePacked("AI at position ", i.toString(), " detonated")));
           }
           aiIndex++;
       }

       return (false, false, "Your turn");
   }

   function makeChoice(bool detonate) external directCallsOnly returns (bool won, string memory result) {
       GameConfigForPlayer storage config = addressToGameConfig[msg.sender];
       require(config.gameActive, "No active game");

       config.gameActive = false;

       uint[4] memory decisions;
       
       uint aiIndex = 0;
       for (uint i = 0; i < 4; i++) {
           if (i != config.playerPosition) {
               if (aiIndex == 0) decisions[i] = config.ai1Decision;
               else if (aiIndex == 1) decisions[i] = config.ai2Decision;
               else decisions[i] = config.ai3Decision;
               aiIndex++;
           } else {
               decisions[i] = detonate ? 1 : 0;
           }
       }

       // Check if someone with detonate button actually detonates
       if (decisions[config.detonateAllIndex] == 1) {
           if (config.detonateAllIndex == config.playerPosition) {
               // Player won by detonating
               survivalTokenContract.mintAndApproveSurvivalContract(msg.sender, 40 ether);
               return (true, "You won by detonating!");
           } else {
               // AI detonated, player lost
               return (false, string(abi.encodePacked("AI at position ", config.detonateAllIndex.toString(), " detonated")));
           }
       }

       // Everyone passed - partial refund
       survivalTokenContract.mintAndApproveSurvivalContract(msg.sender, 5 ether);
       return (true, "Everyone passed - partial refund!");
   }


    function updateTokenContract(address _newTokenAddress) external onlyOwner {
        survivalTokenContract = ISurvivalToken(_newTokenAddress);
    }

    function getGameConfig(
        address player
    ) external view returns (GameConfigForPlayer memory) {
        return addressToGameConfig[player];
    }
}
