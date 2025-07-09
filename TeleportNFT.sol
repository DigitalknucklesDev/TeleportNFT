// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ✅ OpenZeppelin v4.9.3 Upgradeable GitHub Imports
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.9.3/contracts/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.9.3/contracts/security/PausableUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.9.3/contracts/access/OwnableUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.9.3/contracts/proxy/utils/UUPSUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.9.3/contracts/utils/CountersUpgradeable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.9.3/contracts/utils/StringsUpgradeable.sol";

/**
 * @title TeleportNFT
 * @notice Upgradeable ERC-721 contract to work with URI storage and upgradability.
 */
contract TeleportNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using StringsUpgradeable for uint256;

    string public baseUri;
    CountersUpgradeable.Counter private _tokenIdCounter;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, string memory _baseUri) public initializer {
        __ERC721_init("TeleportNFT", "TPNFT");
        __ERC721URIStorage_init();
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();

        transferOwnership(_owner);
        baseUri = _baseUri;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function safeMint(address to, string memory ipfsCID) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        string memory fullUri = string.concat("ipfs://", ipfsCID);

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, fullUri);

        return tokenId;
    }

    function setTokenURI(uint256 tokenId, string memory newCID) public onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        _setTokenURI(tokenId, string.concat("ipfs://", newCID));
    }

    // 🧼 Override tokenURI with fallback logic
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        if (bytes(super.tokenURI(tokenId)).length > 0) {
            return super.tokenURI(tokenId);
        } else {
            return string.concat(baseUri, tokenId.toString(), ".json");
        }
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
