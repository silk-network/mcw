// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Sapphire} from "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/ICryptoFacet.sol";
import "hardhat/console.sol";
import "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";

contract CryptoFacet is ICryptoFacet {

    bytes32 private secretKey;
    address private addr;

    constructor() {
        _rotateSigningKey();
    }

    function getSignerAddress() external view returns (address) {
        return addr;
    }

    function randomBytes(uint256 numBytes, bytes calldata pers) external view returns (bytes memory) {
        return Sapphire.randomBytes(numBytes, pers);
    }

    function sign(bytes32 digest) external view returns (bytes memory) {
        require(secretKey != bytes32(0), "CryptoFacet: No signing key");
        SignatureRSV memory rsv = EthereumUtils.sign(addr, secretKey, digest);
        return bytes.concat(rsv.r, rsv.s, bytes1(uint8(rsv.v)));
    }

    function _rotateSigningKey() internal {

        bytes memory randSeed = Sapphire.randomBytes(32, "CryptoFacet.generateEthereumAccount");
        secretKey = bytes32(randSeed);

        (bytes memory pk, ) = Sapphire.generateSigningKeyPair(Sapphire.SigningAlg.Secp256k1PrehashedKeccak256, randSeed);

        addr = EthereumUtils.k256PubkeyToEthereumAddress(pk);
    }
}
