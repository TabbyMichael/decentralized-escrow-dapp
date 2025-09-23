// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev A smart contract for handling escrow transactions between buyers and sellers
 * with an optional arbiter for dispute resolution
 */
contract Escrow is ReentrancyGuard {
    // Custom Errors
    error FailedToSendEther();

    // State variables
    address public buyer;
    address public seller;
    address public arbiter;
    
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, SHIPPED, DISPUTED, COMPLETE, REFUNDED, RESOLVED }
    State public currentState;
    
    // Events
    event Deposited(address indexed buyer, uint256 amount);
    event ItemShipped(address indexed seller);
    event DisputeRaised(address indexed raisedBy);
    event Released(address indexed seller, uint256 amount);
    event Refunded(address indexed buyer, uint256 amount);
    event DisputeResolved(address indexed resolver, address indexed winner, uint256 amount);
    
    // Modifiers
    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this function");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }
    
    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can call this function");
        _;
    }
    
    modifier inState(State expectedState) {
        require(currentState == expectedState, "Invalid state");
        _;
    }
    
    /**
     * @dev Constructor sets the buyer, seller, and optional arbiter addresses
     * @param _buyer Address of the buyer
     * @param _seller Address of the seller
     * @param _arbiter Address of the arbiter (can be address(0) for no arbiter)
     */
    constructor(address _buyer, address _seller, address _arbiter) {
        require(_buyer != address(0), "Buyer address cannot be zero");
        require(_seller != address(0), "Seller address cannot be zero");
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        currentState = State.AWAITING_PAYMENT;
    }
    
    /**
     * @dev Fallback function to receive ETH deposits from the buyer
     */
    receive() external payable onlyBuyer inState(State.AWAITING_PAYMENT) {
        require(msg.value > 0, "Must send ETH to deposit");
        currentState = State.AWAITING_DELIVERY;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Allows the seller to confirm they have shipped the item
     */
    function confirmShipment() external onlySeller inState(State.AWAITING_DELIVERY) {
        currentState = State.SHIPPED;
        emit ItemShipped(seller);
    }
    
    /**
     * @dev Allows the buyer to release funds to the seller after shipment
     */
    function release() external onlyBuyer nonReentrant inState(State.SHIPPED) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to release");
        
        currentState = State.COMPLETE;
        (bool success, ) = payable(seller).call{value: balance}("");
        if (!success) {
            revert FailedToSendEther();
        }
        
        emit Released(seller, balance);
    }
    
    /**
     * @dev Allows the arbiter to issue a refund to the buyer
     */
    function refund() external onlyArbiter nonReentrant inState(State.AWAITING_DELIVERY) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to refund");
        
        currentState = State.REFUNDED;
        (bool success, ) = payable(buyer).call{value: balance}("");
        if (!success) {
            revert FailedToSendEther();
        }
        
        emit Refunded(buyer, balance);
    }

    /**
     * @dev Allows the buyer or seller to raise a dispute
     */
    function raiseDispute() external inState(State.AWAITING_DELIVERY) {
        require(msg.sender == buyer || msg.sender == seller, "Only buyer or seller can raise a dispute");
        currentState = State.DISPUTED;
        emit DisputeRaised(msg.sender);
    }
    
    /**
     * @dev Function to resolve a dispute and send funds to the winning party
     * Can only be called by the arbiter when a dispute is active
     * @param _winner The address to receive the funds (either buyer or seller)
     */
    function resolveDispute(address _winner) external onlyArbiter nonReentrant inState(State.DISPUTED) {
        require(
            _winner == buyer || _winner == seller,
            "Winner must be either buyer or seller"
        );
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to release");
        
        currentState = State.RESOLVED;
        (bool success, ) = payable(_winner).call{value: balance}("");
        if (!success) {
            revert FailedToSendEther();
        }
        
        emit DisputeResolved(msg.sender, _winner, balance);
    }
    
    /**
     * @dev Function to get the current balance of the escrow
     * @return The current balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Function to get the current state as a string
     * @return A string representing the current state
     */
    function getState() external view returns (string memory) {
        if (currentState == State.AWAITING_PAYMENT) return "AWAITING_PAYMENT";
        if (currentState == State.AWAITING_DELIVERY) return "AWAITING_DELIVERY";
        if (currentState == State.SHIPPED) return "SHIPPED";
        if (currentState == State.DISPUTED) return "DISPUTED";
        if (currentState == State.COMPLETE) return "COMPLETE";
        if (currentState == State.REFUNDED) return "REFUNDED";
        return "RESOLVED";
    }
}
