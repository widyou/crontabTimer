"use strict";

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
	Object.keys = (function () {
		var hasOwnProperty = Object.prototype.hasOwnProperty,
			hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
			dontEnums = [
				'toString',
				'toLocaleString',
				'valueOf',
				'hasOwnProperty',
				'isPrototypeOf',
				'propertyIsEnumerable',
				'constructor'
			],
			dontEnumsLength = dontEnums.length;
		return function (obj) {
			if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
				throw new TypeError('Object.keys called on non-object');
			}
			var result = [], prop, i;
			for (prop in obj) {
				if (hasOwnProperty.call(obj, prop)) {
					result.push(prop);
				}
			}
			if (hasDontEnumBug) {
				for (i = 0; i < dontEnumsLength; i++) {
					if (hasOwnProperty.call(obj, dontEnums[i])) {
						result.push(dontEnums[i]);
					}
				}
			}
			return result;
		};
	}());
}

// define base methods for each unit
var methodsForTimeUnit = {
	minute: {
		get: Date.prototype.getMinutes,
		set: Date.prototype.setMinutes
	},
	hour: {
		get: Date.prototype.getHours,
		set: Date.prototype.setHours
	},
	dayOfMonth: {
		get: Date.prototype.getDate,
		set: Date.prototype.setDate
	},
	month: {
		get: function () { return this.getMonth() + 1; },
		set: function (month) { return this.setMonth(month - 1); }
	},
	DayOfWeek: {
		get: Date.prototype.getDay,
		set: function (dow) {
			var thisDow = this.getDay();
			this.setDate(this.getDate() + (dow - thisDow));
		}
	}
};

// store unit list
var timeUnits = Object.keys(methodsForTimeUnit);

// define additional methods
for (var i in timeUnits) {
	var unit = timeUnits[i];
	methodsForTimeUnit[unit].add = (function() {
		var u = ''+unit; // convert closure to local value
		return function (amount) {
			methodsForTimeUnit[u].set.call(this, methodsForTimeUnit[u].get.call(this) + amount);
		};
	})();
	methodsForTimeUnit[unit].setNext = (function() {
		var u = ''+unit; // convert closure to local value
		return function () {
			methodsForTimeUnit[u].add.call(this, 1);
		};
	})();
	methodsForTimeUnit[unit].setPrev = (function() {
		var u = ''+unit; // convert closure to local value
		return function () {
			methodsForTimeUnit[u].add.call(this, -1);
		};
	})();
	methodsForTimeUnit[unit].getDifference = (function() {
		var u = ''+unit; // convert closure to local value
		return function (destValueStr) {
			var thisValue = methodsForTimeUnit[u].get.call(this);
			if (destValueStr.match(/[0-9]+/)) {
				var destValue = parseInt(destValueStr);
				return destValue - thisValue;
			}
		};
	})();
	// go forward to minimum destination
	methodsForTimeUnit[unit].upToMin = (function() {
		var u = ''+unit; // convert closure to local value
		var that = this;
		return function (destArray) {
			if (typeof destArray === 'undefined' || destArray.constructor !== Array) {
				throw new Error('upToMin function must given array.');
				return false;
			}
			var minDiff = 0;
			if (destArray.length == 0) {
				return false;
			} else if (destArray.length == 1) {
				minDiff = methodsForTimeUnit[u].getDifference.call(this, destArray[0]);
			} else {
				var diffArray = destArray.map(function (e) {
					return methodsForTimeUnit[u].getDifference.call(that, e);
				});
				minDiff = destArray.reduce(function (previous, current) {
					return Math.min(previous, current);
				});
			}
			methodsForTimeUnit[u].add.call(this, minDiff);
		};
	})();
}

// CrontabTimer constructor
var CrontabTimer = function () {
	var that = this;
	this.now = 0;
	// default value
	this.timeString = '* * * * *';
	this.time = {};
	this.prevTime = 0;
	this.nextTime = 0;
	this.option = {
		test: false
	};

	// parse argument
	if (arguments.length > 0) {
		if (arguments[0].constructor === String) {
			// CrontabTimer(time)
			this.timeString = arguments[0];
			if (arguments.length == 2 && arguments[1].constructor === Object) {
				// CrontabTimer(time, option)
				$.extend(this.option, arguments[1]);
			}
		} else if (arguments[0].constructor === Object) {
			// CrontabTimer(option)
			$.extend(this.option, arguments[0]);
		}
	}

	// time setting
	var times = this.timeString.split(' ');
	timeUnits.map(function (timeUnit, i) {
		that.time[timeUnit] = times[i].split(',');
	});
};

// CrontabTimer methods
CrontabTimer.prototype = (function () {
	// private methods
	function checkForUnit(date, unit) {
		// argument check
		if (date.constructor !== Date) {
			throw new Error('Date object not given.');
		}
		var value = methodsForTimeUnit[unit].get.call(date);
		// check for unit
		return -1 !== this.time[unit].findIndex(function (e) {
			if (e == '*' || (e.match(/[0-9]+/) && value == parseInt(e))) {
				//console.log({r:'success1',u:unit,e:e,value:value});
				return true;
			} else {
				var matchArray = e.match(/\*\/(\d+)/);
				if (matchArray) {
					var term = matchArray[1];
					if (value % parseInt(term) == 0) {
						//console.log({r:'success2',u:unit,e:e,value:value});
						return true;
					}
				}
			}
			//console.log({r:'fail',u:unit,e:e,value:value});
			return false;
		});
	}
	var checkForAllUnits = function (date) {
		for (var unit in methodsForTimeUnit) {
			var res = checkForUnit.call(this, date, unit);
			if (res === false)
				return unit;
		}
		return true;
	};
	// calculate next run time and store cache
	var calcNextTime = function () {
		var d = new Date(this.now.getTime());
		var checkResult = checkForAllUnits.call(this, d);
		var tmp = 0;
		while (tmp < 100 && checkResult !== true) {
			methodsForTimeUnit[checkResult].setNext.call(d);
			checkResult = checkForAllUnits.call(this, d);
			tmp++;
		}
		this.nextTime = d.getTime();
	};
	// calculate previous run time and store cache
	var calcPrevTime = function () {
		var d = new Date(this.now.getTime());
		var checkResult = checkForAllUnits.call(this, d);
		var tmp = 0;
		while (tmp < 100 && checkResult !== true) {
			methodsForTimeUnit[checkResult].setPrev.call(d);
			checkResult = checkForAllUnits.call(this, d);
			tmp++;
		}
		this.prevTime = d.getTime();
	};
	var resetNow = function () {
		if (this.option.test)
			this.now = this.option.now;
		else
			this.now = new Date();
	};
	// public methods
	return {
		// next run time
		getNextTime: function () {
			resetNow.call(this);
			// check calculated value is valid
			if (this.nextTime == 0 || this.nextTime < this.now.getTime()) {
				calcNextTime.call(this);
				calcPrevTime.call(this);
			}
			return this.nextTime;
		},
		// previous run time
		getPrevTime: function () {
			resetNow.call(this);
			// check calculated value is valid
			if (this.nextTime == 0 || this.nextTime < this.now.getTime()) {
				calcNextTime.call(this);
				calcPrevTime.call(this);
			}
			return this.prevTime;
		},
		getNextDate: function () {
			return new Date(this.getNextTime());
		},
		getPrevDate: function () {
			return new Date(this.getPrevTime());
		},
		toString: function () {
			return this.timeString;
		},
		test: function () {
		}
	};
})();
