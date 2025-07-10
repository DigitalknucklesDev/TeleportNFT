// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title TeleportController
 * @notice Stores teleport states across linked NFTs with ERC-6551 Token-Bound Accounts (TBAs).
 */
contract TeleportController is Ownable {
    using Strings for uint256;

    struct TeleportState {
        string currentCID;
        string altCID;
        bool isMerged;
        uint256 lastTeleport;
        bool isCooldown;
    }

    mapping(address => mapping(uint256 => TeleportState)) public tokenState;
    mapping(address => mapping(uint256 => uint256)) public tokenPair;

    uint256 public cooldownTime = 1 days;

    event TeleportTriggered(
        address indexed nft,
        uint256 indexed fromId,
        uint256 indexed toId,
        string newFromCID,
        string newToCID
    );

    event CooldownStarted(address indexed nft, uint256 tokenId);

    /// ✅ Pass the deployer as the initial owner to Ownable
    constructor(address initialOwner) Ownable(initialOwner) {}

    function setInitialState(
        address nft,
        uint256 tokenId,
        string memory defaultCID,
        string memory altCID
    ) external onlyOwner {
        tokenState[nft][tokenId] = TeleportState({
            currentCID: defaultCID,
            altCID: altCID,
            isMerged: false,
            lastTeleport: 0,
            isCooldown: false
        });
    }

    function setTokenPair(address nft, uint256 tokenA, uint256 tokenB) external onlyOwner {
        tokenPair[nft][tokenA] = tokenB;
        tokenPair[nft][tokenB] = tokenA;
    }

    function teleport(address nft, uint256 fromId, uint256 toId) external {
        address fromOwner = IERC721(nft).ownerOf(fromId);
        address toOwner = IERC721(nft).ownerOf(toId);

        require(tokenPair[nft][fromId] == toId, "Not paired");
        require(msg.sender == fromOwner || msg.sender == toOwner, "Unauthorized");

        TeleportState storage sender = tokenState[nft][fromId];
        TeleportState storage receiver = tokenState[nft][toId];

        require(!sender.isCooldown, "Sender in cooldown");

        sender.lastTeleport = block.timestamp;
        sender.isCooldown = true;
        emit CooldownStarted(nft, fromId);

        string memory senderOldCID = sender.currentCID;
        sender.currentCID = sender.altCID;
        receiver.currentCID = senderOldCID;

        sender.isMerged = false;
        receiver.isMerged = true;

        emit TeleportTriggered(nft, fromId, toId, sender.currentCID, receiver.currentCID);
    }

    function getState(address nft, uint256 tokenId) external view returns (TeleportState memory) {
        return tokenState[nft][tokenId];
    }

    function checkCooldown(address nft, uint256 tokenId) external {
        TeleportState storage t = tokenState[nft][tokenId];
        if (t.isCooldown && block.timestamp >= t.lastTeleport + cooldownTime) {
            t.isCooldown = false;
        }
    }

    function forceReset(address nft, uint256 tokenId) external onlyOwner {
        tokenState[nft][tokenId].isCooldown = false;
        tokenState[nft][tokenId].lastTeleport = 0;
    }

    function updateCooldownTime(uint256 newCooldown) external onlyOwner {
        cooldownTime = newCooldown;
    }
}
