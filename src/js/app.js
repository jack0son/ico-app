App = {
  web3Provider: null,
  contracts: {},

  var tokenRegistry = []

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

  getLog: function() {
	var crowdsaleInstance;

	logArray = []
		
	var account = accounts[3];
	App.contracts.Crowdsale.deployed().then(function(instance){
		crowdsaleInstance = instance;
		let purchaseEvent = crowdsaleInstance.TokenPurchase({}, {fromBlock: 0, toBlock: 'latest'});
		purchaseEvent.get((error, logs) => {
			logs.forEach(log => console.log(log.args))
			logs.forEach(log => logArray.push(log))
			console.log(logArray[0])
			App.drawTable(logArray);
		});
	});

	return logArray;
  },


  watchLog: function() {
	var crowdsaleInstance;

	dicks = 'test'
	logArray = []
	web3.eth.getAccounts(function(error, accounts) {
		if (error) {
			console.log(error);
		}
		
		var account = accounts[3];
		App.contracts.Crowdsale.deployed().then(function(instance){
			crowdsaleInstance = instance			let purchaseEvent = crowdsaleInstance.TokenPurchase({},{fromBlock: 0, toBlock: 'latest'});
			purchaseEvent.watch((error, logs) => {
				console.log(logs);
				console.log(logArray);
				logArray.push(logs);
				console.log('Watch calling drawTable...')
				App.drawTable(logArray);
			});
		});
  	});
  },

  drawTable: function(logArray) {
	  $("table tbody tr").remove();

	  for (var i = 0; i < logArray.length; i++) {
		  console.log('In log array: ' + i)
			var markup = "<tr><td>" 
				+ i + "</td><td>"
				+ logArray[i].args.purchaser + "</td><td>"
				+ parseInt(logArray[i].args.amount) + "  </td><td>" 
				+ web3.toWei(parseInt(logArray[i].args.value),'ether') 
				+ "</td></tr>";
			$("table tbody").append(markup);
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
		App.watchLog();
		//user our contract to retrieve and mark the adopted pets.
		// Call UI refresh function
		//return App.markAdopted();
	});
    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handlePurchase);
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


  }

  createRegistry: function() {
	  var holders = {}; // array of all token holders


	App.contracts.Crowdsale.deployed().then(function(instance){
		crowdsaleInstance = instance;
		crowdsaleInstance.token.then(addr => {tokenAddress = addr});
		tokenInstance = App.contracts.MintableToken.at(addr); 
			logArray = App.getLog();
	  for(var i=0; i < transLog.length; i++){
		  //get balance of purchaser
		  //if larger than 0 add to holders

		  var trans = logArray[i].args
		  holders[trans.purchaser] = {'balance':MintableToken.balanceOf(trans.purchaser)}
		  
	  }

	}).catch(function(err){
		console.log(err.message);
	});


  }

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
