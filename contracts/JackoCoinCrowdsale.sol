
pragma solidity ^0.4.11;

import './JackoCoin.sol';
import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';


contract JackoCoinCrowdsale is Crowdsale {

  function JackoCoinCrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _rate, address _wallet) Crowdsale(_startBlock, _endBlock, _rate, _wallet) {
    }

	  // creates the token to be sold.
	    // override this method to have crowdsale of a specific MintableToken token.
		  function createTokenContract() internal returns (MintableToken) {
		      return new JackoCoin();
			    }

}
