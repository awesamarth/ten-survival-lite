// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract SurvivalToken is ERC20, Ownable {
    
    error InsufficientEther();
    
    
    address public survivalContract;

    
    constructor() ERC20("Survival Token", "SRV") Ownable(msg.sender) {}
    
    modifier onlyOwnerOrSurvivalContract (){
        require(msg.sender==survivalContract || msg.sender== owner());
        _;
    }

    function setSurvivalContract(address _survivalContract) external onlyOwner {
        survivalContract = _survivalContract;
    }
    
    // Mint tokens to a player
    function mint(address _to, uint256 _amount) public onlyOwnerOrSurvivalContract() {
        _mint(_to, _amount);
    }

    
    
    function mintAndApproveSurvivalContract(address _player, uint256 _amount) external onlyOwnerOrSurvivalContract() {
        require(survivalContract != address(0), "Survival contract not set");
        
        // Mint tokens to player
        _mint(_player, _amount);
        _approve(_player, survivalContract, type(uint256).max);
    }
}