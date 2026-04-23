// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IReviewManager {
    function hasReviewed(string memory ipfsHash, address reviewer) external view returns (bool);
}

contract RewardSystem {

    IReviewManager public reviewManager;

    mapping(address => uint256) public reputation;
    mapping(string => mapping(address => bool)) public rewarded;

    struct Certificate {
        string ipfsHash;
        address reviewer;
        uint256 timestamp;
    }

    mapping(uint256 => Certificate) public certificates;
    uint256 public certificateCount;

    event ReviewerRewarded(string ipfsHash, address reviewer, uint256 amount);
    event CertificateIssued(uint256 certificateId, string ipfsHash, address reviewer);

    constructor(address _reviewManager) {
        reviewManager = IReviewManager(_reviewManager);
    }

    function rewardReviewer(string memory ipfsHash, address reviewer) external payable {
        require(msg.value > 0, "No reward sent");

        require(
            reviewManager.hasReviewed(ipfsHash, reviewer),
            "Reviewer has not reviewed"
        );

        require(
            !rewarded[ipfsHash][reviewer],
            "Already rewarded"
        );

        rewarded[ipfsHash][reviewer] = true;

        reputation[reviewer] += 1;

        (bool success, ) = reviewer.call{value: msg.value}("");
        require(success, "Transfer failed");

        certificateCount++;

        certificates[certificateCount] = Certificate({
            ipfsHash: ipfsHash,
            reviewer: reviewer,
            timestamp: block.timestamp
        });

        emit ReviewerRewarded(ipfsHash, reviewer, msg.value);

        emit CertificateIssued(certificateCount, ipfsHash, reviewer);
    }

}
