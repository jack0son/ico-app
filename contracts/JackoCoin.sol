pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';

contract JackoCoin is MintableToken {
  string public name = "JACKO COIN";
    string public symbol = "JAK";
	  uint256 public decimals = 18;
}

