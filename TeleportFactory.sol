// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TeleportNFT.sol"; // Your logic contract

contract TeleportFactory {
    address public implementation;

    event TeleportDeployed(address indexed proxy, address indexed owner);

    constructor() {
        // Deploy the logic contract once on factory deployment
        implementation = address(new TeleportNFT());
    }

    function deployTeleport(address owner, string memory baseUri) external returns (address) {
        // Encode the initializer function call
        bytes memory data = abi.encodeWithSelector(
            TeleportNFT.initialize.selector,
            owner,
            baseUri
        );

        // Deploy the proxy and call initialize
        ERC1967Proxy proxy = new ERC1967Proxy(implementation, data);

        emit TeleportDeployed(address(proxy), owner);
        return address(proxy);
    }
}
