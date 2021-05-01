var policy = null;
var values = null;

var thrownDices = [];
var thrownDiceWrapper = null;

var dicesCollected = [];

window.onload = function() {
//	loadPolicy();
	loadValues();
	loadDices();
}

function loadDices() {
	thrownDiceWrapper = document.getElementById("dice_wrapper");
	for (var i = 1; i <= 6; i++) {
		thrownDices.push(document.getElementById("dice_" + i));
	}
	thrownDiceWrapper.innerHTML = '';
}

function loadPolicy() {
	loadFile("policy.csv", function(text) {
		var lines = text.split('\n');
		policy = {}
		for (var i = 1; i < lines.length; i++) {
			var line = lines[i];
			var lastCommaIndex = line.lastIndexOf(',')
			policy[lines.substring(0, lastCommaIndex)] = parseFloat(line.substring(lastCommaIndex + 1));
		}
	});
}

function loadValues() {
	loadFile("values.csv", function(text) {
		values = {};
		return values;
	});
}

function loadFile(filename, initVariableCallback) {
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var variable = initVariableCallback();
			var lines = this.responseText.split('\n');
			for (var i = 1; i < lines.length; i++) {
				var line = lines[i];
				var lastCommaIndex = line.lastIndexOf(',')
				variable[line.substring(0, lastCommaIndex)] = parseFloat(line.substring(lastCommaIndex + 1));
			}
			checkState();
		}
	}
	request.open("GET", filename, true);
	console.log("SENDING");
	request.send();
}

function checkState() {
	var messageVisibility = "hidden";
	var containerVisibility = "visible";
	if (values == null) {
		messageVisibility = "visible";
		containerVisibility = "hidden";
	}
	document.getElementById("visibility_message").style.visibility = messageVisibility;
	document.getElementById("visibility_container").style.visibility = containerVisibility;
}

function getNumberValue(id) {
	var value = document.getElementById(id).value;
	if (value == "") {
		return -1;
	}
	try {
		return parseInt(value);
	} catch(err) {
		return -1;
	}
}

function errorOutput(output) {
	document.getElementById("error_message").innerHTML = output;
}

function sendOutput(advice, lowAdvice, highAdvice, currentAdvice) {
	document.getElementById("advice").innerHTML = advice;
	document.getElementById("low_advice").innerHTML = lowAdvice;
	document.getElementById("high_advice").innerHTML = highAdvice;
	document.getElementById("current_advice").innerHTML = currentAdvice;
}

function shareOrDrink(drinks, numDices, pastTense) {
	var firstWord;
	if (drinks < 0) {
		firstWord = "moet";
		if (pastTense) {
			firstWord = "moest";
		}
		return firstWord + " je " + (numDices != 6 ? "gemiddeld " : "") + Math.abs(drinks) + " slokken drinken."
	} else {
		firstWord = "mag";
		if (pastTense) {
			firstWord = "mocht";
		}
		return firstWord + " je gemiddeld " + drinks + " slokken uitdelen.";
	}
}

function showObjects(objects) {
	thrownDiceWrapper.innerHTML = '';
	for (var i = 1; i <= 6; i++) {
		thrownDices[i - 1].style.backgroundColor = 'white';
		if (objects.filter(o => o == i).length > 0) {
			thrownDiceWrapper.append(thrownDices[i - 1]);
		}
	}
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function pickDice(dice, numDices) {
	for (var i = 0; i < numDices; i++) {
		dicesCollected.push(dice);
	}
	console.log(dicesCollected);
	showObjects([]);
	var sumSetDices = dicesCollected.length == 0 ? 0 : dicesCollected.reduce((acc, x) => acc + x);
	var key = sumSetDices + "," + dicesCollected.length;
	console.log(key);
	var utility = values[key];
	var currentAdvice = "Nu " + shareOrDrink(utility, dicesCollected.length);
	
	sendOutput("", "", "", currentAdvice);
	errorOutput("");
	document.getElementById("values_label").innerHTML = "Gooi " + (6 - dicesCollected.length) + " dobbels:";
	document.getElementById("values_thrown_dices").value = "";
}

function changeOutput() {
	console.log("Entering change function");
	checkState();
	var valuesThrownDices = getNumberValue("values_thrown_dices");
	
	if (valuesThrownDices == -1) {
		errorOutput("Vul alle velden in.")
		console.log("At least one field not filled in.")
		sendOutput("", "", "", "");
		return
	}
	
	var valuesThrownDices = valuesThrownDices.toString().split('').map(i => parseInt(i)).filter((i) => i != 0);
	if (valuesThrownDices.includes('0')) {
		errorOutput('Je kunt helemaal niet nul gooien lul.');
		sendOutput("", "", "", "");
		console.log("Zero in thrown")
		return
	}
	
	if (valuesThrownDices.length + dicesCollected.length != 6) {
		errorOutput("Je moet " + (6 - dicesCollected.length) + " dobbelstenen gooien.");
		sendOutput("", "", "", "");
		console.log("Wrong number of dices thrown");
		return;
	}
	var sumSetDices = dicesCollected.length == 0 ? 0 : dicesCollected.reduce((acc, x) => acc + x);
	var currentKey = sumSetDices + "," + dicesCollected.length;
	var currentUtility = values[currentKey];
	var currentAdvice = "Voor deze gooi " + shareOrDrink(currentUtility, dicesCollected.length, true);
	
	var uniqueThrownDices = valuesThrownDices.filter(onlyUnique);
	showObjects(uniqueThrownDices);
	
	var highestValue = -99999;
	var highestDice = -1;
	for (var i = 0; i < uniqueThrownDices.length; i++) {
		var dice = uniqueThrownDices[i];
		var numDices = valuesThrownDices.filter((d) => d == dice).length;
		var newNumDices = dicesCollected.length + numDices;
		var newSumDices = sumSetDices + numDices * dice;
		var key = newSumDices + "," + newNumDices;
		var utility = values[key];
		if (utility > highestValue) {
			highestValue = utility;
			highestDice = dice;
		}
		console.log("Setting " + "pickDice(" + dice + ", " + numDices + ")" + " on dice " + (dice + 1));
		thrownDices[dice - 1].setAttribute("onclick", "pickDice(" + dice + ", " + numDices + ")")
		document.getElementById("dice_" + dice + "_message").innerHTML = Math.abs(utility) + (utility > 0 ? " uitdelen" : " drinken");
	}
	
	console.log(highestDice);
	document.getElementById("dice_" + highestDice).style.color = 'green';
	
	showObjects(uniqueThrownDices);
	
	sendOutput("", "", "", currentAdvice);
	errorOutput("");
}