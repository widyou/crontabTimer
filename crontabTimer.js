"use strict";
var methodsForTimeUnit = {
	minute: {
		get: function () {
			return this.getMinutes();
		},
		add: function (amount) {
			this.setMinutes(this.getMinutes() + amount);
		},
		next: function (target) {
			var thisMin = this.getMinutes();
			if (thisMin <= target) {
				this.setMinutes(this.getMinutes() + (target - thisMin));
			} else {
				this.setMinutes(this.getMinutes() + (target + 60 - thisMin));
			}
		}
	},
	hour: {
		get: function () {
			return this.getHours();
		}
	},
	dayOfMonth: {
		get: function () {
			return this.getDate();
		}
	},
	month: {
		get: function () {
			return this.getMonth() + 1;
		}
	},
	DayOfWeek: {
		get: function () {
			return this.getDay();
		}
	}
};


var timeUnits = [];
for (var i in methodsForTimeUnit) {
	timeUnits.push(i);
}
console.log(timeUnits);

// constructor
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

CrontabTimer.prototype = (function () {
	// private
	var checkForUnit = function (date, unit) {
		// argument check
		if (date.constructor !== Date) {
			throw new Error('Date object not given.');
		}
		//console.log(methodsForTimeUnit);return;
		var value = methodsForTimeUnit[unit].get.call(date);
		console.log('unit: '+unit+', value: '+value);
		// check minute
		return -1 !== this.time[timeUnits[0]].findIndex(function (e) {
			if (e == '*' || value == parseInt(e)) {
				return true;
			} else {
				return false;
			}
		});
	};
	var checkForAllUnits = function (date) {
		for (var unit in methodsForTimeUnit) {
			var res = checkForUnit.call(this, date, unit);
			console.log('res: '+res);
			if (res === false)
				return false;
		}
		return true;
	};
	var calcNextTime = function () {
		// 다음 수행시간 계산
		var d = new Date();
		console.log('result:'+checkForAllUnits.call(this, d));

		this.nextTime++;
	};
	var calcPrevTime = function () {
		log('call calcPrevTime');
		this.prevTime--;
	};
	var timeCheck = function (date) {
	};
	// public
	return {
		// 다음 수행시간
		getNextTime: function () {
			log('call getNextTime');
			// 이미 계산된 값이 유효하지 않으면 해당 값을 리턴
			if (this.nextTime == 0 || this.nextTime < new Date().getTime()) {
				calcNextTime.call(this);
			}
			return this.nextTime;
		},
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
			//console.log(checkForUnit.call(this,new Date(),timeUnits[0]));
		}
	};
})();
