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

    struct Journal {
        string  name;
        address editor;
        uint256 submissionFee;
    }

    // CID string → Paper record
    mapping(string => Paper) private papers;

    // Ordered list of all submitted CIDs (for enumeration)
    string[] public allCIDs;

    // Journal registry
    mapping(uint256 => Journal) public journals;
    uint256 public journalCount;

    // CID → journalId (0 = direct submission, not via journal)
    mapping(string => uint256) public paperToJournal;

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

    event JournalCreated(
        uint256 indexed journalId,
        string          name,
        address indexed editor,
        uint256         fee
    );

    event PaperSubmittedToJournal(
        string  indexed ipfsCID,
        uint256 indexed journalId,
        address indexed author
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
    /// @dev Internal registration — shared by submitPaper & submitToJournal.
    function _registerPaper(string calldata _ipfsCID, address _author) internal {
        require(bytes(_ipfsCID).length > 0, "CID cannot be empty");
        require(!papers[_ipfsCID].exists,   "Paper already registered");

        papers[_ipfsCID] = Paper({
            ipfsCID:   _ipfsCID,
            author:    _author,
            timestamp: block.timestamp,
            exists:    true
        });

        allCIDs.push(_ipfsCID);

        emit PaperSubmitted(_ipfsCID, _author, block.timestamp);
    }

    /**
     * @notice Submit a paper CID directly to the registry (no journal fee).
     * @param _ipfsCID The IPFS CID returned after uploading the PDF.
     */
    function submitPaper(string calldata _ipfsCID) external {
        _registerPaper(_ipfsCID, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────
    //  Journal functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Create a new journal. Caller becomes editor.
     * @param _name          Human-readable journal name.
     * @param _submissionFee Fee (in wei) required to submit a paper.
     */
    function createJournal(string calldata _name, uint256 _submissionFee) external {
        require(bytes(_name).length > 0, "Journal name cannot be empty");
        journalCount++;
        journals[journalCount] = Journal({
            name:          _name,
            editor:        msg.sender,
            submissionFee: _submissionFee
        });
        emit JournalCreated(journalCount, _name, msg.sender, _submissionFee);
    }

    /**
     * @notice Submit a paper to a specific journal, paying the required fee.
     * @param _ipfsCID  The IPFS CID of the paper.
     * @param _journalId The target journal's ID (1-indexed).
     */
    function submitToJournal(string calldata _ipfsCID, uint256 _journalId) external payable {
        require(_journalId > 0 && _journalId <= journalCount, "Invalid journal ID");
        Journal storage j = journals[_journalId];
        require(msg.value >= j.submissionFee, "Insufficient submission fee");

        _registerPaper(_ipfsCID, msg.sender);
        paperToJournal[_ipfsCID] = _journalId;

        emit PaperSubmittedToJournal(_ipfsCID, _journalId, msg.sender);
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
