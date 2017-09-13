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
	  App.watchLog();
	  //App.createRegistry();
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
			console.log('In getLog.');
			logs.forEach(log => console.log(log.args))
			logs.forEach(log => logArray.push(log))
			callback(logArray);
			//console.log(logArray[0])
		});
	});

	return logArray;
  },
  
  watchLog: function() {
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
			purchaseEvent.watch((error, logs) => {
				console.log(logs);
				console.log(logArray);
				logArray.push(logs);
				console.log('Watch calling drawLog...')
				App.drawLog(logArray);
				App.createRegistry();
			});
		}).catch(function(err){
			console.log(err.message);
		});
  	});
  },

  updateRegistry: function(transaction) {


  },

	createRegistry: function() {
		var holders = {}; // array of all token holders

		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance;
			crowdsaleInstance.token().then(addr => {
				tokenAddress = addr;
				console.log(tokenAddress)
				tokenInstance = App.contracts.MintableToken.at(tokenAddress); 
				
				// Get transaction history
				App.getLog(function (logArray) {
					let promises = logArray.map((log) => {
						return tokenInstance.balanceOf(log.args.purchaser).then(function(balance){
								console.log(balance);
								holders[log.args.purchaser] = {'balance':balance}
								console.log(holders[log.args.purchaser]);
							});
						});

					Promise.all(promises).then(() =>{
						console.log('Done');
						App.drawRegistry(holders);
					});
				});
			});
		});
	},

	drawLog: function(logArray) {
	  $(".log > tbody > tr").remove();

	  for (var i = 0; i < logArray.length; i++) {
		  console.log('In log array: ' + i)
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
	  $(".registry > tbody > tr").remove();
	  console.log('Draw registry called.');
	  console.log(holders)
	  for (holder in holders) {
		  console.log(holder);
			var markup = "<tr><td>" 
				+ holder + "</td><td>"
				+ holders[holder]['balance']
				+ "</td></tr>";
			$(".registry > tbody").append(markup);
	  }

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
