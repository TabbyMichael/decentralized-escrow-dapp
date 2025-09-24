// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev A smart contract for handling escrow transactions with ERC20 tokens
 * between buyers and sellers with an optional arbiter for dispute resolution.
 */
contract Escrow is ReentrancyGuard {
    // Custom Errors
    error FailedToSendToken();

    // State variables
    address public buyer;
    address public seller;
    address public arbiter;
    IERC20 public immutable token;
    uint256 public immutable amount;
    
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, DISPUTED, COMPLETE, REFUNDED, RESOLVED }
    State public currentState;
    
    // Events
    event Deposited(address indexed buyer, uint256 depositedAmount);
    event ItemShipped(address indexed seller);
    event DisputeRaised(address indexed raisedBy);
    event Released(address indexed seller, uint256 releasedAmount);
    event Refunded(address indexed buyer, uint256 refundedAmount);
    event DisputeResolved(address indexed resolver, address indexed winner, uint256 resolvedAmount);
    
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
     * @dev Constructor sets the parties, the token, and the amount.
     * @param _buyer Address of the buyer.
     * @param _seller Address of the seller.
     * @param _arbiter Address of the arbiter.
     * @param _token Address of the ERC20 token contract.
     * @param _amount The amount of tokens to be held in escrow.
     */
    constructor(
        address _buyer,
        address _seller,
        address _arbiter,
        address _token,
        uint256 _amount
    ) {
        require(_buyer != address(0), "Buyer address cannot be zero");
        require(_seller != address(0), "Seller address cannot be zero");
        require(_token != address(0), "Token address cannot be zero");
        require(_amount > 0, "Amount must be greater than zero");

        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        token = IERC20(_token);
        amount = _amount;
        currentState = State.AWAITING_PAYMENT;
    }
    
    /**
     * @dev Allows the buyer to deposit the agreed-upon amount of tokens.
     * The buyer must have previously approved the contract to spend this amount.
     */
    function deposit() external onlyBuyer inState(State.AWAITING_PAYMENT) {
        bool success = token.transferFrom(buyer, address(this), amount);
        require(success, "Token transfer from buyer failed");

        currentState = State.AWAITING_DELIVERY;
        emit Deposited(buyer, amount);
    }

    /**
     * @dev Allows the seller to confirm they have shipped the item.
     * Note: This version of the contract does not include a "SHIPPED" state
     * to simplify the state machine. Release can happen directly after delivery confirmation.
     */
    function confirmDelivery() external onlySeller inState(State.AWAITING_DELIVERY) {
        currentState = State.COMPLETE;
        emit ItemShipped(seller); // Re-using ItemShipped event for simplicity
    }
    
    /**
     * @dev Allows the buyer to release funds to the seller after delivery.
     */
    function release() external onlyBuyer nonReentrant inState(State.COMPLETE) {
        bool success = token.transfer(seller, amount);
        if (!success) {
            revert FailedToSendToken();
        }
        emit Released(seller, amount);
    }

    /**
     * @dev Allows the buyer or seller to raise a dispute before the item is marked as delivered.
     */
    function raiseDispute() external inState(State.AWAITING_DELIVERY) {
        require(msg.sender == buyer || msg.sender == seller, "Only buyer or seller can raise a dispute");
        currentState = State.DISPUTED;
        emit DisputeRaised(msg.sender);
    }
    
    /**
     * @dev Function to resolve a dispute and send funds to the winning party.
     * Can only be called by the arbiter when a dispute is active.
     * @param _winner The address to receive the funds (either buyer or seller).
     */
    function resolveDispute(address _winner) external onlyArbiter nonReentrant inState(State.DISPUTED) {
        require(
            _winner == buyer || _winner == seller,
            "Winner must be either buyer or seller"
        );
        
        currentState = State.RESOLVED;
        bool success = token.transfer(_winner, amount);
        if (!success) {
            revert FailedToSendToken();
        }
        
        emit DisputeResolved(msg.sender, _winner, amount);
    }

    /**
     * @dev Allows the arbiter to refund the buyer if something goes wrong before delivery.
     */
    function refundBuyer() external onlyArbiter nonReentrant inState(State.AWAITING_DELIVERY) {
        currentState = State.REFUNDED;
        bool success = token.transfer(buyer, amount);
        if (!success) {
            revert FailedToSendToken();
        }
        emit Refunded(buyer, amount);
    }
}
