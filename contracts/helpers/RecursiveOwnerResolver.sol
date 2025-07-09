// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC6551Account {
    function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId);
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract RecursiveOwnerResolver {
    struct Ownership {
        address owner;
        address tokenContract;
        uint256 tokenId;
    }

    uint8 public constant MAX_DEPTH = 5;

    function resolveRecursiveOwner(address tokenContract, uint256 tokenId) external view returns (Ownership[] memory path) {
        path = new Ownership[](MAX_DEPTH);

        address currentOwner = IERC721(tokenContract).ownerOf(tokenId);
        uint8 depth = 0;

        while (depth < MAX_DEPTH) {
            path[depth] = Ownership(currentOwner, tokenContract, tokenId);

            if (isContract(currentOwner)) {
                try IERC6551Account(currentOwner).token() returns (uint256 chainId, address parentContract, uint256 parentTokenId) {
                    if (chainId != block.chainid) break; // cross-chain TBAs not supported
                    tokenContract = parentContract;
                    tokenId = parentTokenId;
                    currentOwner = IERC721(tokenContract).ownerOf(tokenId);
                    depth++;
                    continue;
                } catch {
                    break;
                }
            }
            break;
        }

        // Shrink array if fewer levels
        if (depth + 1 < MAX_DEPTH) {
            Ownership[] memory trimmed = new Ownership[](depth + 1);
            for (uint8 i = 0; i <= depth; i++) {
                trimmed[i] = path[i];
            }
            return trimmed;
        }

        return path;
    }

    function isContract(address addr) internal view returns (bool) {
        return addr.code.length > 0;
    }
}
