App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    // Load pets.
    $.getJSON('../pets.json', function(data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (i = 0; i < data.length; i ++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-breed').text(data[i].breed);
        petTemplate.find('.pet-age').text(data[i].age);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }
    });

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
				console.log('Watch calling drawTable...')
				App.drawTable(logArray);
			});
		}).catch(function(err){
			console.log(err.message);
		});
  	});
  },

  drawTable: function(logArray) {
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

  initContract: function() {
	$.getJSON('JackoCoinCrowdsale.json', function(data) {
		//get the necessary contract artifact file and instnatiate it with truffle-contract.
		var CrowdsaleArtifact = data;
		App.contracts.Crowdsale = TruffleContract(CrowdsaleArtifact);

		//set the provider for our contract.
		App.contracts.Crowdsale.setProvider(App.web3Provider);
		//App.getLog();
		//App.watchLog();
		//user our contract to retrieve and mark the adopted pets.
		// Call UI refresh function
		//return App.markAdopted();
	}).then(function () {
		$.getJSON('JackoCoin.json', function(data) {
			var MintableTokenArtifact = data;
			App.contracts.MintableToken = TruffleContract(MintableTokenArtifact);
			App.contracts.MintableToken.setProvider(App.web3Provider);

			//App.createRegistry();
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
	  App.createRegistry();
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
	//return App.watchLog();
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
			//logArray = App.getLog();
		  	console.log('In create registry.');
		  	//console.log(logArray);
		  	//console.log(logArray.length);
		  	// for some reason the array 
		  	App.getLog(function (logArray) {
				console.log(logArray);
			  	console.log(logArray.length);
			  // i think forEach is blocking...
				  // capture transaction to avoid async problems
				let requests = logArray.map((item) => {
					return new Promise((resolve) => {	  
						//function(item, resolve){
							let trans = item.args;	
				  			tokenInstance.balanceOf(trans.purchaser).then(function(balance){
					  			console.log(balance);
					  			holders[trans.purchaser] = {'balance':balance}
				  			}).then(function(){
				 				console.log(holders[trans.purchaser]);
								resolve();
							});
						//}
					});
				});
				Promise.all(requests).then(() =>{
					console.log('done');
					App.drawRegistry(holders);
				});
				
			});
		});
	});
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
