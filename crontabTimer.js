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
	methodsForTimeUnit[unit].plusOne = (function() {
		var u = ''+unit; // convert closure to local value
		return function () {
			methodsForTimeUnit[u].add.call(this, 1);
		};
	})();
	methodsForTimeUnit[unit].minusOne = (function() {
		var u = ''+unit; // convert closure to local value
		return function () {
			methodsForTimeUnit[u].add.call(this, -1);
		};
	})();
}

// CrontabTimer constructor
var CrontabTimer = function () {
	var that = this;
	// default value
	this.timeString = '* * * * *';
	this.time = {};
	this.prevTime = 0;
	this.nextTime = 0;
	this.option = {};

	// parse argument
	if (arguments.length > 0) {
		if (arguments[0].constructor === String) {
			// CrontabTimer(time)
			this.timeString = arguments[0];
			if (arguments.length == 2 && arguments[1].constructor === Array) {
				// CrontabTimer(time, option)
				$.extend(this.option, arguments[1]);
			}
		} else if (arguments[0].constructor === Array) {
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
		// check minute
		return -1 !== this.time[timeUnits[0]].findIndex(function (e) {
			if (e == '*' || (!isNaN(e) && value == parseInt(e))) {
				return true;
			} else {
				var matchArray = e.match(/\*\/(\d+)/);
				if (matchArray) {
					var term = matchArray[1];
					if (value % parseInt(term) == 0) {
						return true;
					}
				}
			}
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
		log('call calcNextTime');
		var d = new Date();

		this.nextTime++;
	};
	// calculate previous run time and store cache
	var calcPrevTime = function () {
		log('call calcPrevTime');
		this.prevTime--;
	};
	var timeCheck = function (date) {
	};
	// public methods
	return {
		// next run time
		getNextTime: function () {
			log('call getNextTime');
			// 이미 계산된 값이 유효하지 않으면 해당 값을 리턴
			if (this.nextTime == 0 || this.nextTime < new Date().getTime()) {
				calcNextTime.call(this);
			}
			return this.nextTime;
		},
		// previous run time
		getPrevTime: function () {
			log('call getPrevTime');
			// 이미 계산된 값이 유효하지 않으면 해당 값을 리턴
			if (this.prevTime == 0) {
				calcPrevTime.call(this);
			}
			return this.prevTime;
		},
		toString: function () {
			return this.timeString;
		},
		test: function () {
			var dt = new Date();
			methodsForTimeUnit['minute'].plusOne.call(dt);
			console.log(dt.toLocaleTimeString());
			methodsForTimeUnit['minute'].plusOne.call(dt);
			console.log(dt.toLocaleTimeString());
			methodsForTimeUnit['minute'].plusOne.call(dt);
			console.log(dt.toLocaleTimeString());
		}
	};
})();
