var policy = null;
var values = null;

window.onload = function() {
//	loadPolicy();
	loadValues();
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

function changeOutput() {
	console.log("Entering change function");
	checkState();
	var sumSetDices = getNumberValue("sum_set_dices");
	var valuesThrownDices = getNumberValue("values_thrown_dices");
	
	if (sumSetDices == -1 || valuesThrownDices == -1) {
		errorOutput("Vul alle velden in.")
		console.log("At least one field not filled in.")
		sendOutput("", "", "", "");
		return
	}
	
	if (sumSetDices < 0 || sumSetDices > 36) {
		var errorMessage = "Je kunt deze som nooit gegooid hebben.";
		errorOutput(errorMessage);
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
	
	
	var totalNumDices = 6;
	var dicesThrown = valuesThrownDices.length;
	var numSetDices = totalNumDices - dicesThrown;
	
	var street = [1, 2, 3, 4, 5, 6];
	const equals = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
	if (equals(valuesThrownDices.sort(), street)) {
		sendOutput("JOOOO STRAAT! Iedereen spiezuuhhh", "", "", "")
		errorOutput("")
		console.log("Street has been thrown")
		return
	}
	
	var currentKey = sumSetDices + "," + numSetDices;
	var currentUtility = values[currentKey];
	var currentAdvice = "Voor deze gooi " + shareOrDrink(currentUtility, numSetDices, true);

	if (valuesThrownDices.filter((i) => i != valuesThrownDices[0]).length == 0) {
		var nextSumDices = sumSetDices + valuesThrownDices.length * valuesThrownDices[0];
		var key = nextSumDices + "," + 6;
		var value = values[key];
		var adviceText = "Je moet duiken!!";
		if (value < 0) {
			sendOutput(adviceText, "en " + Math.abs(value) + " slokken drinken.", "", "");
		} else {
			sendOutput(adviceText, "Je mag gemiddeld " + value + " slokken uitdelen.", "", "");
		}
		return;
	}
	
	var maxValue = valuesThrownDices.reduce((max, current) => Math.max(max, current));
	var maxCount = valuesThrownDices.filter((i) => i == maxValue).length;
	var nextMaxNumDices = numSetDices + maxCount;
	var nextMaxSumDices = sumSetDices + maxCount * maxValue;
	
	var minValue = valuesThrownDices.reduce((min, current) => Math.min(min, current));
	var minCount = valuesThrownDices.filter((i) => i == minValue).length;
	var nextMinNumDices = numSetDices + minCount;
	var nextMinSumDices = sumSetDices + minCount * minValue;
	
	
	var maxKey = nextMaxSumDices + "," + nextMaxNumDices;
	var minKey = nextMinSumDices + "," + nextMinNumDices;

	var maxUtility = values[maxKey];
	var minUtility = values[minKey];
	
	var adviceText = "Je moet duiken!!";
	if (maxUtility > minUtility) {
		adviceText = "Je moet stijgen";
	}
	
	
	var lowAdvice = "Als je de " + minCount + " dobbels van " + minValue + " pakt, " + shareOrDrink(minUtility, nextMinNumDices);
	if (minCount == 1) {
		var lowAdvice = "Als je de dobbel van " + minValue + " pakt, " + shareOrDrink(minUtility, nextMinNumDices);
	}
	
	var highAdvice = "Als je de " + maxCount + " dobbels van " + maxValue + " pakt, " + shareOrDrink(maxUtility, nextMaxNumDices);
	if (maxCount == 1) {
		var highAdvice = "Als je de dobbel van " + maxValue + " pakt, " + shareOrDrink(maxUtility, nextMaxNumDices);
	}
	
	
	sendOutput(adviceText, lowAdvice, highAdvice, currentAdvice);
	errorOutput("");
}