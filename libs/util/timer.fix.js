// фикс порядка аргументов в функциях-таймерах - он меня бесит
pkg('util.timer.fix', () => {

	var sourceSetTimeout = setTimeout,
		sourceSetInterval = setInterval;

	var wrapperFor = sourceFunction => {
		return function(a, b){
			(arguments.length === 2) || fail('Expected timer function to receive exactly 2 arguments, got ' + arguments.length + ' instead.');
			
			if(typeof(a) === 'number' && typeof(b) === 'function'){
				sourceFunction(b, a);
			} else if(typeof(b) === 'number' && typeof(a) === 'function'){
				sourceFunction(a, b);
			} else {
				fail('Expected timer function to receive arguments of type number and function (or vice versa); got ' + typeof(a) + ' and ' + typeof(b) + ' instead.');
			}
		}
	}
		
	return () => {
		setTimeout = wrapperFor(setTimeout);
		setInterval = wrapperFor(setInterval);
	}
		
});