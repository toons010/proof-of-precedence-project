// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPaperRegistry.sol";

/**
 * @title ReviewManager
 * @notice Peer-review layer for Proof of Precedence.
 *         Reviewers register once, then submit a scored review for any
 *         paper that already exists in PaperRegistry. One review per
 *         reviewer per paper.
 */
contract ReviewManager {

    // ─────────────────────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────────────────────

    IPaperRegistry public immutable registry;

    mapping(address => bool) public isReviewer;

    struct Review {
        address reviewer;
        uint8   score;      // 1–5
        string  comments;
    }

    // CID → ordered list of reviews
    mapping(string => Review[]) private reviews;

    // CID → reviewer → already reviewed?
    mapping(string => mapping(address => bool)) public hasReviewed;

    // ─────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────

    event ReviewerRegistered(address indexed reviewer);
    event ReviewSubmitted(
        string  indexed ipfsHash,
        address indexed reviewer,
        uint8           score
    );

    // ─────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────

    /**
     * @param _registry Address of the deployed PaperRegistry contract.
     */
    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IPaperRegistry(_registry);
    }

    // ─────────────────────────────────────────────────────────────
    //  Functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Register the caller as a reviewer.
     *         Any address may self-register; can be gated by governance later.
     */
    function registerReviewer() external {
        require(!isReviewer[msg.sender], "Already registered");
        isReviewer[msg.sender] = true;
        emit ReviewerRegistered(msg.sender);
    }

    /**
     * @notice Submit a review for a paper.
     * @param _ipfsHash  CID of the paper being reviewed.
     * @param _score     Quality score from 1 (poor) to 5 (excellent).
     * @param _comments  Free-text review comments.
     */
    function submitReview(
        string calldata _ipfsHash,
        uint8           _score,
        string calldata _comments
    ) external {
        require(isReviewer[msg.sender],              "Not a registered reviewer");
        require(_score >= 1 && _score <= 5,          "Score must be between 1 and 5");
        require(registry.paperExists(_ipfsHash),     "Paper not found in registry");
        require(!hasReviewed[_ipfsHash][msg.sender], "Already reviewed this paper");

        reviews[_ipfsHash].push(Review({
            reviewer: msg.sender,
            score:    _score,
            comments: _comments
        }));

        hasReviewed[_ipfsHash][msg.sender] = true;

        emit ReviewSubmitted(_ipfsHash, msg.sender, _score);
    }

    /**
     * @notice Returns the total number of reviews for a paper.
     * @param _ipfsHash CID of the paper.
     */
    function reviewCount(string calldata _ipfsHash) external view returns (uint256) {
        return reviews[_ipfsHash].length;
    }

    /**
     * @notice Retrieve a specific review by index.
     * @param _ipfsHash CID of the paper.
     * @param _index    Zero-based index into the reviews array.
     */
    function getReview(string calldata _ipfsHash, uint256 _index)
        external
        view
        returns (
            address reviewer,
            uint8   score,
            string memory comments
        )
    {
        require(_index < reviews[_ipfsHash].length, "Index out of bounds");
        Review storage r = reviews[_ipfsHash][_index];
        return (r.reviewer, r.score, r.comments);
    }
}
