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
			App.web3Provider = new web3.providers.HttpProvider('http://localhost:8445');
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
		$(document).on('click', '.btn-adopt', App.handlePurchase);
		return App.initUI();
	},

	initUI: function() {
		App.watchLog(logArray => {
			App.drawLog(logArray);
			App.updateRegistry([logArray[logArray.length-1]]);
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

			var account = accounts[3];
			//
			App.contracts.Crowdsale.deployed().then(function(instance){
				crowdsaleInstance = instance;

				return crowdsaleInstance.sendTransaction({value:web3.toWei(2,'ether')});
				//}).then(function(result) {
				//	return App.markAdopted();
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

			var account = accounts[3];
			App.contracts.Crowdsale.deployed().then(function(instance){
				crowdsaleInstance = instance;
				let purchaseEvent = crowdsaleInstance.TokenPurchase({},{fromBlock: 0, toBlock: 'latest'});
				purchaseEvent.watch((error, log) => {
					logArray.push(log);
					//App.drawLog(logArray);
					//App.updateRegistry([log]);
					callback(logArray);
				});
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
				console.log('Token address: ' + tokenAddress);
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

	drawLog: function(logArray) {
		$(".log > tbody > tr").remove();
		console.log('Draw log called.');

		for (var i = 0; i < logArray.length; i++) {
				var markup = "<tr><td>" 
				+ i + "</td><td>"
				+ logArray[i].args.purchaser + "</td><td>"
				+ parseInt(logArray[i].args.amount) + "  </td><td>" 
				+ web3.toWei(parseInt(logArray[i].args.value),'ether') 
				+ "</td></tr>";
			$(".log > tbody").append(markup);
		}

	},

	drawRegistry: function(holders) {
		console.log('Draw registry.')
		for(holder in holders){
			console.log('Holder entry length: ' + $(".registry > tbody > tr#"+holder).length);
			if($(".registry > tbody > tr#"+holder).length){
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
			+ holder.balance
			+ "</td></tr>";
		$(".registry > tbody").append(markup);
	},
	
	updateHolder: function(holder) {
		console.log('Update holder.');
		console.log(holder);
		$(".registry > tbody > tr#" + holder.address + " > td.balance").remove()
		//console.log(holder);
		var markup = "<td class=balance>" 
			+ holder.balance
			+ "</td>";
		$(".registry > tbody > tr#" + holder.address).append(markup);

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
