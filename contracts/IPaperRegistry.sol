// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPaperRegistry {
    function paperExists(string memory ipfsHash) external view returns (bool);
}
