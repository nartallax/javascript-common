pkg('util.time', () => {
	var twoDigits = n => n > 9? n + '': '0' + n,
		threeDigits = n => n > 99? n + '': '0' + twoDigits(n);
		
	let dateOf = d => typeof(d) === "number"? new Date(d): d && (d instanceof Date)? d: null;
		
	var timeToString = d => twoDigits(d.getHours()) + ':' + twoDigits(d.getMinutes()) + ':' + twoDigits(d.getSeconds())
	var dateToString = d => d.getFullYear() + '.' + twoDigits(d.getMonth() + 1) + '.' + twoDigits(d.getDate())
	var formatDateTime = d => {
		d = dateOf(d) || new Date()
		return dateToString(d) + ' ' + timeToString(d) + ' ' + threeDigits(d.getMilliseconds());
	}
	let formatUnixtimeToDateTimeMinutesOrEmpty = d => {
		d = dateOf(d * 1000);
		return !d? "": dateToString(d) + " " + twoDigits(d.getHours()) + ":" + twoDigits(d.getMinutes())
	}
	var formatDateTimeSeconds = d => {
		d || (d = new Date());
		return dateToString(d) + ' ' + timeToString(d);
	}
	
	return {
		unixtime: d => Math.floor((d || new Date()).getTime() / 1000),
		milliseconds: d => (d || new Date()).getTime(),
		unixtimeToDate: u => new Date(u * 1000),
		millisecondsToDate: m => new Date(m),
		formatDate: formatDateTime,
		formatUnixtimeToDateTimeMinutesOrEmpty: formatUnixtimeToDateTimeMinutesOrEmpty, 
		formatUnixtime: u => formatDateTimeSeconds(new Date(u * 1000)),
		formatMilliseconds: m => formatDateTime(new Date(m)),
		nowString: formatDateTime,
		unixtimeNowString: formatDateTimeSeconds
	}

});