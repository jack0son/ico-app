App = {
	web3Provider: null,
	contracts: {},

	init: function() {
		// Load pets.
		return App.initWeb3();
	},

	initWeb3: function() {
		if ( typeof web3 !== 'undefined' ) {
			App.web3Provider = web3.currentProvider;
			web3 = new Web3(web3.currentProvider);
		} else {
			App.web3Provider = new web3.providers.HttpProvider('http://localhost:8545');
			web3 = new Web3(App.web3Provider);
		}

		return App.initContract();
	},

	initContract: function() {
		$.getJSON('JackoCoinCrowdsale.json', function(data) {
			//get the necessary contract artifact file and instnatiate it with truffle-contract.
			var CrowdsaleArtifact = data;
			App.contracts.Crowdsale = TruffleContract(CrowdsaleArtifact);
			App.contracts.Crowdsale.setProvider(App.web3Provider);

		}).then(function () {
			$.getJSON('JackoCoin.json', function(data) {
				var MintableTokenArtifact = data;
				App.contracts.MintableToken = TruffleContract(MintableTokenArtifact);
				App.contracts.MintableToken.setProvider(App.web3Provider);

			});
		}).then(function () {
			return App.bindEvents();
		});
	},

	bindEvents: function() {
		$(document).on('click', '#purchase', App.handlePurchase);

		return App.initUI();
	},

	initUI: function() {
		App.getTokenPrice();
		console.log("INIT UI CALLED");
		App.watchLog(logArray => {
			console.log("LOG ARRAY LENGTH: ", logArray.length);
			App.drawLog(logArray);
			//App.updateRegistry(logArray);
			App.updateRegistry([logArray[logArray.length-1]]);
			App.updateFundsRaised();
			App.updateTokensSold();
			App.updateSharesRemaining();
		});
		//App.initRegistry();
	},

	handlePurchase: function() {
		event.preventDefault();

		//var petId = parseInt($(event.target).data('id'));

		var crowdsaleInstance;

		web3.eth.getAccounts(function(error, accounts) {
			if (error) {
				console.log(error);
			}

			//var account = accounts[3];
			//
			App.contracts.Crowdsale.deployed().then(function(instance){
				crowdsaleInstance = instance;

				return crowdsaleInstance.sendTransaction({value:web3.toWei(1,'ether')});
			}).catch(function(err){
				console.log(err.message);
			});
		});
	},


	getLog: function(callback) {
		var crowdsaleInstance;

		var logArray = [];
		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			let purchaseEvent = crowdsaleInstance.TokenPurchase({}, {fromBlock: 0, toBlock: 'latest'});
			purchaseEvent.get((error, logs) => {
				logs.forEach(log => logArray.push(log));
				callback(logArray);
			});
		});
	},

	watchLog: function(callback) {
		var crowdsaleInstance;
		var logArray = [];
		web3.eth.getAccounts(function(error, accounts) {
			if (error) {
				console.log(error);
			}
			// var account = accounts[3];
			App.contracts.Crowdsale.deployed().then(function(instance){
				crowdsaleInstance = instance;

				//let purchaseEvent = crowdsaleInstance.TokenPurchase({},{fromBlock: 0});//, toBlock: 'latest'});

				var purchaseEvent = crowdsaleInstance.TokenPurchase({},{fromBlock: 0, toBlock: 'latest'});//, (error,log) => {//, toBlock: 'latest'});
				purchaseEvent.watch((error, log) => {
					console.log('pushing entry to log');
					logArray.push(log);
					callback(logArray);
				});
				console.log("Finished watching.")


			}).catch(function(err){
				console.log(err.message);
			});
		});
	},

	updateRegistry: function(logArray) {
		var holders = {}; // array of all token holders

		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			crowdsaleInstance.token().then(addr => {
				tokenAddress = addr;
				//console.log('Token address: ' + tokenAddress);
				tokenInstance = App.contracts.MintableToken.at(tokenAddress);

				// Get transaction history
				let promises = logArray.map((log) => {
					return tokenInstance.balanceOf(log.args.purchaser).then(function(balance){
						holders[log.args.purchaser] = {'address':log.args.purchaser,'balance':balance}
						console.log(holders[log.args.purchaser]);
					});
				});

				console.log('Waiting on balance calls...');
				Promise.all(promises).then(() => {
					console.log('Finished balance calls.');
					App.drawRegistry(holders);
				});
			});
		});
	},

	updateFundsRaised: function() {
		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			crowdsaleInstance.weiRaised().then(weiRaised => {
				// App.drawFundsRaised(web3.fromWei(weiRaised,'ether'));
				App.drawFundsRaised(web3.fromWei(weiRaised,'ether'));
			});
		});
	},


	// how many token units a buyer gets per eth
	getTokenPrice: function() {
		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			// rate: how many token units a buyer gets per wei
			crowdsaleInstance.rate().then(rate => {
				// App.drawTokenPrice(web3.toWei(rate,'ether'));
				App.drawTokenPrice(rate);
			});
		});
	},

	updateTokensSold: function() {
		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			crowdsaleInstance.token().then(addr => {
				tokenAddress = addr;
				//console.log('Token address: ' + tokenAddress);
				tokenInstance = App.contracts.MintableToken.at(tokenAddress);
				tokenInstance.totalSupply().then(totalSupply => {
					//console.log('Total supply: ' + totalSupply);
					App.drawTokensSold(totalSupply);
				});
			});
		});
	},

	updateSharesRemaining: function() {
		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			crowdsaleInstance.token().then(addr => {
				tokenAddress = addr;
				//console.log('Token address: ' + tokenAddress);
				tokenInstance = App.contracts.MintableToken.at(tokenAddress);
				tokenInstance.totalSupply().then(totalSupply => {
					//console.log('Total supply: ' + totalSupply);
					App.drawSharesRemaining(totalSupply);
				});
			});
		});
	},

	drawFundsRaised: function(fundsRaised) {
		$("#total-raised-value").text(fundsRaised + " ETH");

	},

	drawTokensSold: function(tokensSold) {
		$("#tokens-sold").text(web3.fromWei(tokensSold, "ether") + " shares");

	},

	drawSharesRemaining: function(tokensSold) {
		$("#shares-remaining").text(400-web3.fromWei(tokensSold, "ether") + " shares");

	},


	drawTokenPrice: function(tokenPrice) {
		$("#token-price").text(tokenPrice + " ETH/share");

	},

	drawLog: function(logArray) {
		$(".transaction-log-table > tbody > tr").remove();
		console.log('Draw log called.');

		for (var i = 0; i < logArray.length; i++) {
				var markup = "<tr><td>"
				+ i + "</td><td>"
				+ logArray[i].args.purchaser + "</td><td>"
				+ parseInt(web3.fromWei(logArray[i].args.amount, "ether")) + " shares" + "</td><td>"
				+ parseInt(web3.fromWei(logArray[i].args.value, "ether")) + " ETH"
				+ "</td></tr>";
			$(".transaction-log-table > tbody").append(markup);
		}


	},

	drawRegistry: function(holders) {
		console.log('Draw.registry-table.')
		for(holder in holders){
			// Number of entries in registry for a holder
			// (should only be 1 or 0
			//console.log('Holder entry length: ' + $(".registry-table > tbody > tr#"+holder).length);
			if($(".registry-table > tbody > tr#"+holder).length){
				App.updateHolder(holders[holder]);
			} else {
				App.addHolder(holders[holder]);
			}
		}
	},


	addHolder: function(holder) {
		console.log('Add holder.');
		var markup = "<tr id="+holder.address+"><td>"
			+ holder.address + "</td><td class=balance>"
			+ web3.fromWei(holder.balance, "ether")
			+ "</td></tr>";
		$(".registry-table > tbody").append(markup);
	},

	updateHolder: function(holder) {
		console.log('Update holder.');
		console.log(holder);
		$(".registry-table > tbody > tr#" + holder.address + " > td.balance").remove()
		//console.log(holder);
		var markup =
			"<td class=balance>"
			+ web3.fromWei(holder.balance, "ether")
			+ "</td>";
		$(".registry-table > tbody > tr#" + holder.address).append(markup);

	},

	markAdopted: function(adopters, account) {
		var adoptionInstance;

		App.contracts.Adoption.deployed().then(function(instance){
			adoptionInstance = instance;

			return adoptionInstance.getAdopters.call();
		}).then(function(adopters) {
			for ( i = 0; i < adopters.length; i++) {
				if (adopters[i] !== '0x0000000000000000000000000000000000000000'){
					$('.panel-pet').eq(i).find('button').text('Pending...').attr('disabled', true);
				}
			}
		}).catch(function(err){
			console.log(err.message);
		});

	}

};

$(function() {
	$(window).load(function() {
		App.init();
	});
});
