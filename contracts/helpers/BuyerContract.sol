// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Escrow.sol";

contract BuyerContract {
    Escrow public escrow;

    function deployEscrow(address _seller, address _arbiter) public {
        escrow = new Escrow(_seller, _arbiter);
    }

    function getEscrowAddress() public view returns (address) {
        return address(escrow);
    }

    receive() external payable {
        revert("Payment rejected");
    }
}
