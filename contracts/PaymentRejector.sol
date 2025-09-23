// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

// A simple contract that rejects any Ether sent to it, but can interact with other contracts.
contract PaymentRejector {

    // Function to call confirmShipment on the Escrow contract
    function doConfirmShipment(address escrowAddress) external {
        Escrow(payable(escrowAddress)).confirmShipment();
    }

    receive() external payable {
        revert("Payment rejected");
    }
}
