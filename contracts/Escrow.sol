// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Escrow
 * @dev A smart contract for handling escrow transactions between buyers and sellers
 * with an optional arbiter for dispute resolution
 */
contract Escrow is Pausable, Ownable {
    // State variables
    address public buyer;
    address public seller;
    address public arbiter;
    uint256 public deadline;
    
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, COMPLETE, REFUNDED, DISPUTED }
    State public currentState;
    
    // Events
    event Deposited(address indexed buyer, uint256 amount);
    event Released(address indexed seller, uint256 amount);
    event Refunded(address indexed buyer, uint256 amount);
    event DisputeResolved(address indexed resolver, address indexed winner, uint256 amount);
    
    // Modifiers
    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this function");
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
     * @param _seller Address of the seller
     * @param _arbiter Address of the arbiter (can be address(0) for no arbiter)
     */
    constructor(address _seller, address _arbiter) Ownable(msg.sender) {
        require(_seller != address(0), "Seller address cannot be zero");
        buyer = msg.sender;
        seller = _seller;
        arbiter = _arbiter;
        currentState = State.AWAITING_PAYMENT;
    }
    
    /**
     * @dev Pauses the contract. Can only be called by the owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract. Can only be called by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Function to deposit ETH into the escrow.
     * Can only be called by the buyer.
     */
    function deposit() external payable onlyBuyer inState(State.AWAITING_PAYMENT) whenNotPaused {
        require(msg.value > 0, "Must send ETH to deposit");
        currentState = State.AWAITING_DELIVERY;
        deadline = block.timestamp + 30 days;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Allows the buyer to claim a refund if the deadline has passed.
     */
    function claimRefundAfterDeadline() external onlyBuyer inState(State.AWAITING_DELIVERY) whenNotPaused {
        require(block.timestamp >= deadline, "Deadline not passed yet");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to refund");

        currentState = State.REFUNDED;
        (bool success, ) = payable(buyer).call{value: balance}("");
        require(success, "Transfer failed");

        emit Refunded(buyer, balance);
    }
    
    /**
     * @dev Function to release funds to the seller
     * Can be called by buyer or arbiter
     */
    function release() external inState(State.AWAITING_DELIVERY) whenNotPaused {
        require(
            msg.sender == buyer || msg.sender == arbiter,
            "Only buyer or arbiter can release funds"
        );
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to release");
        
        currentState = State.COMPLETE;
        (bool success, ) = payable(seller).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Released(seller, balance);
    }
    
    /**
     * @dev Function to refund the buyer
     * Can be called by buyer or arbiter
     */
    function refund() external inState(State.AWAITING_DELIVERY) whenNotPaused {
        require(
            msg.sender == buyer || msg.sender == arbiter,
            "Only buyer or arbiter can refund"
        );
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to refund");
        
        currentState = State.REFUNDED;
        (bool success, ) = payable(buyer).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Refunded(buyer, balance);
    }
    
    /**
     * @dev Function to resolve a dispute and send funds to the winning party
     * Can only be called by the arbiter
     * @param _winner The address to receive the funds (either buyer or seller)
     */
    function resolveDispute(address _winner) external onlyArbiter inState(State.AWAITING_DELIVERY) whenNotPaused {
        require(
            _winner == buyer || _winner == seller,
            "Winner must be either buyer or seller"
        );
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to release");
        
        currentState = State.DISPUTED;
        (bool success, ) = payable(_winner).call{value: balance}("");
        require(success, "Transfer failed");
        
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
     * @dev Function to get the current state of the escrow
     * @return The current state as a uint8 enum value
     */
    function getState() external view returns (State) {
        return currentState;
    }
}
