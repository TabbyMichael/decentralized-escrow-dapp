// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

/**
 * @title EscrowFactory
 * @dev A factory contract to create and track multiple Escrow contract instances.
 */
contract EscrowFactory {
    // Event to announce the creation of a new escrow
    event EscrowCreated(
        address indexed escrowAddress,
        address indexed buyer,
        address indexed seller,
        address arbiter
    );

    // Array to store the addresses of all deployed Escrow contracts
    address[] public deployedEscrows;

    /**
     * @dev Creates a new Escrow contract and stores its address.
     * @param _seller The address of the seller.
     * @param _arbiter The address of the arbiter.
     * @return The address of the newly created Escrow contract.
     */
    function createEscrow(address _seller, address _arbiter) public returns (address) {
        // The caller of this function is the buyer
        address buyer = msg.sender;

        // Create a new Escrow contract
        Escrow newEscrow = new Escrow(buyer, _seller, _arbiter);
        address newEscrowAddress = address(newEscrow);

        // Store the address of the new contract
        deployedEscrows.push(newEscrowAddress);

        // Emit an event to log the creation
        emit EscrowCreated(newEscrowAddress, buyer, _seller, _arbiter);

        return newEscrowAddress;
    }

    /**
     * @dev Returns the list of all deployed Escrow contracts.
     * @return An array of addresses.
     */
    function getDeployedEscrows() public view returns (address[] memory) {
        return deployedEscrows;
    }
}
