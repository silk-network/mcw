// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import  "./SpokeEndpoint.sol";
import "./BaseIntent.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEIP712} from "../shared/interfaces/IEIP712.sol";

contract ChainVault is SpokeEndpoint, BaseIntent, IEIP712 {

    struct Args {
        address enclaveEndpoint;
        address signerAddress;
    }

    using SafeERC20 for IERC20;

    uint256 private immutable _CACHED_CHAIN_ID;
    bytes32 private immutable _DOMAIN_SEPARATOR;

    constructor(Args memory _args) SpokeEndpoint(_args.enclaveEndpoint, getMessageBus()) {
        s.authSigners[_args.signerAddress] = true;
        _DOMAIN_SEPARATOR = LibEIP712.buildDomainSeparator();
        _CACHED_CHAIN_ID = block.chainid;
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return block.chainid == _CACHED_CHAIN_ID ? _DOMAIN_SEPARATOR : LibEIP712.buildDomainSeparator();
    }

    receive() external payable {
        deposit();
    }

    function registerPermitAuthProvider(address signer) public {
        s.authSigners[signer] = true;
    }

    function unregisterPermitAuthProvider(address signer) internal {
        delete s.authSigners[signer];
    }

    function estimateMsgFee() public view returns (uint256) {
        bytes memory envelope = _msgEnvelope("estimate", abi.encode(block.chainid, address(this), address(this), uint(0)));
        return estimateFee(envelope.length);
    }

    function deposit() public payable {
        require(msg.value > 0, "Invalid amount");
        //console.log("deposit", msg.sender, msg.value);
        _postMessage("deposit", abi.encode(block.chainid, msg.sender, address(0), msg.value - estimateMsgFee()));
    }

    function depositToken(address asset, uint amount) public payable {
        require(amount > 0, "Invalid amount");
        require(msg.value == estimateMsgFee(), "Invalid msgFee amount");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        //console.log(IERC20(asset).totalSupply());
        //console.log( msg.sender, address(this), amount, IERC20(asset).balanceOf(msg.sender));
        _postMessage("deposit", abi.encode(block.chainid, msg.sender, asset, amount));
    }

    function withdraw(WithdrawIntent memory intent, bytes memory signature) public payable {
        require(msg.value == estimateMsgFee(), "Invalid msgFee amount");
        require(intent.recipient == msg.sender, "NotAllowed");

        intentWithdraw(intent, signature);

        _postMessage("withdraw", abi.encode(block.chainid, intent.recipient, address(0), intent.amount));
    }

    function withdrawToken(WithdrawTokenIntent memory intent, bytes memory signature) public payable {
        require(msg.value == estimateMsgFee(), "Invalid msgFee amount");
        require(intent.recipient == msg.sender, "NotAllowed");

        intentWithdrawToken(intent, signature);

        _postMessage("withdraw", abi.encode(block.chainid, intent.recipient, intent.token, intent.amount));
    }

}
