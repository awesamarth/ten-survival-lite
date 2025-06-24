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

contract SurvivalContract {
    using Strings for uint256;

    event GameEnded(
        address indexed player,
        bool won,
        uint256 tokensEarned,
        uint8 playerPosition,
        uint8 specialButtonPosition,
        string actor,
        string actionType
    );

    error AlreadyRegistered();
    error InsufficientEther();
    error GameNotActive();

    address public owner;
    uint public totalPlayerCount;
    ISurvivalToken public survivalTokenContract;

    mapping(address => GameConfigForPlayer) private addressToGameConfig;
    mapping(address => bool) public registered;

    uint constant gameFee = 9 ether;

    struct GameConfigForPlayer {
        address playerAddress;
        uint detonateAllIndex;
        uint randomness;
        bool ai1Decision; // false = pass, true = detonate
        bool ai2Decision;
        bool ai3Decision;
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
            100 ether
        );
    }

    function startGame(uint8 _position) external directCallsOnly {
        require(_position < 4, "Invalid position");
        require(registered[msg.sender], "Not registered");
        require(
            !addressToGameConfig[msg.sender].gameActive,
            "Game already active"
        );

        survivalTokenContract.transferFrom(msg.sender, address(this), gameFee);

        // uint256 baseRandom = 123456789;
        uint256 baseRandom = uint256(block.prevrandao); 

        GameConfigForPlayer storage config = addressToGameConfig[msg.sender];
        config.playerAddress = msg.sender;
        config.randomness = baseRandom;
        config.detonateAllIndex = baseRandom % 4;

        config.ai1Decision = (baseRandom >> 1) % 2 == 1;
        config.ai2Decision = (baseRandom >> 17) % 2 == 1;
        config.ai3Decision = (baseRandom >> 33) % 2 == 1;
        config.gameActive = true;
        config.playerPosition = _position;

        // Check if any AI before player's position detonates (either special button or self-destruct)
        bool[3] memory aiDecisions = [
            config.ai1Decision,
            config.ai2Decision,
            config.ai3Decision
        ];
        uint aiIndex = 0;
        for (uint i = 0; i < _position; i++) {
            if (aiDecisions[aiIndex]) {
                // AI at position i will detonate (either themselves or everyone)
                config.gameActive = false;
                // Figure out which AI this is and get their name
                string memory aiName;
                if (aiIndex == 0) aiName = "Alice";
                else if (aiIndex == 1) aiName = "Bob";
                else aiName = "Charlie";

                if (i == config.detonateAllIndex) {
                    // AI has special button - detonates everyone
                    emit GameEnded(
                        msg.sender,
                        false,
                        0,
                        uint8(_position),
                        uint8(config.detonateAllIndex),
                        aiName,
                        "special-button"
                    );
                    return;
                } else {
                    // AI self-destructed - player survives and gets bonus
                    survivalTokenContract.mintAndApproveSurvivalContract(
                        msg.sender,
                        12 ether
                    );
                    emit GameEnded(
                        msg.sender,
                        true,
                        12 ether,
                        uint8(_position),
                        uint8(config.detonateAllIndex),
                        aiName,
                        "self-destruct"
                    );
                    return;
                }
            }
            aiIndex++;
        }

        // Game continues - player's turn
    }

    function makeChoice(bool detonate) external directCallsOnly {
        GameConfigForPlayer storage config = addressToGameConfig[msg.sender];
        require(config.gameActive, "No active game");

        config.gameActive = false;

        // Check who detonates and handle outcomes (from player position onwards)
        for (uint i = config.playerPosition; i < 4; i++) {
            bool willDetonate = false;

            if (i == config.playerPosition) {
                willDetonate = detonate;
            } else {
                // Get AI index for this position (0, 1, 2 for AI1, AI2, AI3)
                uint aiIndex = 0;
                for (uint j = 0; j < i; j++) {
                    if (j != config.playerPosition) {
                        aiIndex++;
                    }
                }

                if (aiIndex == 0) willDetonate = config.ai1Decision;
                else if (aiIndex == 1) willDetonate = config.ai2Decision;
                else if (aiIndex == 2) willDetonate = config.ai3Decision;
            }

            if (willDetonate) {
                if (i == config.detonateAllIndex) {
                    // Someone with special button detonated
                    if (i == config.playerPosition) {
                        // Player won by using special button - gets 36 SRV (3 other players × 9 SRV from each)
                        survivalTokenContract.mintAndApproveSurvivalContract(
                            msg.sender,
                            36 ether
                        );
                        emit GameEnded(
                            msg.sender,
                            true,
                            36 ether,
                            uint8(config.playerPosition),
                            uint8(config.detonateAllIndex),
                            "You",
                            "special-button"
                        );
                        return;
                    } else {
                        // AI with special button detonated everyone - player loses
                        // Calculate which AI this is
                        uint currentAiIndex = 0;
                        for (uint j = 0; j < i; j++) {
                            if (j != config.playerPosition) {
                                currentAiIndex++;
                            }
                        }
                        string memory aiName;
                        if (currentAiIndex == 0) aiName = "Alice";
                        else if (currentAiIndex == 1) aiName = "Bob";
                        else aiName = "Charlie";
                        emit GameEnded(
                            msg.sender,
                            false,
                            0,
                            uint8(config.playerPosition),
                            uint8(config.detonateAllIndex),
                            aiName,
                            "special-button"
                        );
                        return;
                    }
                } else {
                    // Someone without special button detonated (self-destruct)
                    if (i == config.playerPosition) {
                        // Player self-destructed - loses
                        emit GameEnded(
                            msg.sender,
                            false,
                            0,
                            uint8(config.playerPosition),
                            uint8(config.detonateAllIndex),
                            "You",
                            "self-destruct"
                        );
                        return;
                    } else {
                        // AI self-destructed - player survives and gets refund + bonus
                        // Player gets their 9 back + 3 from the AI that self-destructed = 12 total
                        // Calculate which AI this is
                        uint currentAiIndex = 0;
                        for (uint j = 0; j < i; j++) {
                            if (j != config.playerPosition) {
                                currentAiIndex++;
                            }
                        }
                        string memory aiName;
                        if (currentAiIndex == 0) aiName = "Alice";
                        else if (currentAiIndex == 1) aiName = "Bob";
                        else aiName = "Charlie";
                        survivalTokenContract.mintAndApproveSurvivalContract(
                            msg.sender,
                            12 ether
                        );
                        emit GameEnded(
                            msg.sender,
                            true,
                            12 ether,
                            uint8(config.playerPosition),
                            uint8(config.detonateAllIndex),
                            aiName,
                            "self-destruct"
                        );
                        return;
                    }
                }
            }
        }

        survivalTokenContract.mintAndApproveSurvivalContract(
            msg.sender,
            4 ether
        );
        emit GameEnded(
            msg.sender,
            true,
            4 ether,
            uint8(config.playerPosition),
            uint8(config.detonateAllIndex),
            "Everyone",
            "passed"
        );
    }

    function updateTokenContract(address _newTokenAddress) external onlyOwner {
        survivalTokenContract = ISurvivalToken(_newTokenAddress);
    }

}
