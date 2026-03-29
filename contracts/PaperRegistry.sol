// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PaperRegistry
 * @notice Proof of Precedence system for academic papers.
 *         Each paper's IPFS CID is stored on-chain with the author's
 *         address and the exact block timestamp — creating an immutable,
 *         tamper-proof record of who published what, and when.
 */
contract PaperRegistry {

    // ─────────────────────────────────────────────────────────────
    //  Data structures
    // ─────────────────────────────────────────────────────────────

    struct Paper {
        string  ipfsCID;        // IPFS Content Identifier for the PDF
        address author;         // Wallet that submitted the paper
        uint256 timestamp;      // Block timestamp at submission
        bool    exists;         // Guard flag to detect duplicates
    }

    // CID string → Paper record
    mapping(string => Paper) private papers;

    // Ordered list of all submitted CIDs (for enumeration)
    string[] public allCIDs;

    // ─────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────

    /**
     * @dev Emitted every time a new paper is successfully registered.
     * @param ipfsCID   The IPFS CID of the uploaded paper.
     * @param author    Address of the submitting author.
     * @param timestamp Block timestamp of the submission.
     */
    event PaperSubmitted(
        string  indexed ipfsCID,
        address indexed author,
        uint256         timestamp
    );

    // ─────────────────────────────────────────────────────────────
    //  Core functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Submit a paper CID to the registry.
     * @dev    Reverts if the CID has already been registered,
     *         preventing any author from claiming precedence twice.
     * @param _ipfsCID The IPFS CID returned after uploading the PDF.
     */
    function submitPaper(string calldata _ipfsCID) external {
        require(bytes(_ipfsCID).length > 0, "CID cannot be empty");
        require(!papers[_ipfsCID].exists,   "Paper already registered");

        papers[_ipfsCID] = Paper({
            ipfsCID:   _ipfsCID,
            author:    msg.sender,
            timestamp: block.timestamp,
            exists:    true
        });

        allCIDs.push(_ipfsCID);

        emit PaperSubmitted(_ipfsCID, msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieve the full record for a given CID.
     * @param _ipfsCID The CID to look up.
     * @return ipfsCID   The stored CID (echoed back for convenience).
     * @return author    The address that submitted the paper.
     * @return timestamp Unix timestamp of submission.
     * @return exists    Whether the paper exists in the registry.
     */
    function getPaper(string calldata _ipfsCID)
        external
        view
        returns (
            string  memory ipfsCID,
            address        author,
            uint256        timestamp,
            bool           exists
        )
    {
        Paper storage p = papers[_ipfsCID];
        return (p.ipfsCID, p.author, p.timestamp, p.exists);
    }

    /**
     * @notice Quick existence check — useful for deduplication on the frontend.
     * @param _ipfsCID CID to test.
     * @return True if the paper has already been registered.
     */
    function paperExists(string calldata _ipfsCID) external view returns (bool) {
        return papers[_ipfsCID].exists;
    }

    /**
     * @notice Returns the total number of registered papers.
     */
    function totalPapers() external view returns (uint256) {
        return allCIDs.length;
    }
}
