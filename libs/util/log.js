pkg('util.log', () => {
	var nowString = pkg('util.time').nowString,
		Addict = pkg('meta.addict');
		
	var str = smth => {
		switch(typeof(smth)) {
			case "function":return "[some function]";
			case "object":
				if(smth.message) 
					return smth.message; // for exceptions
				if(typeof(smth.toString) === 'function' && smth.toString !== Object.prototype.toString && smth.toString !== Array.prototype.toString)
					return smth.toString()
				try {
					return JSON.stringify(smth);
				} catch(e){
					return '[some recursive object]';
				}
			case 'undefined': return 'undefined';
			case 'string': return smth;
			case 'number': return smth !== smth? 'NaN': smth + '';
			case "boolean":	return smth? 'true': 'false';
			case 'symbol': return smth.toString();
			default: return smth + '';
		}
	}

	var doEmitLog = (args, logger) => {
		var res = '';
		for(var i = 0; i < args.length; i++) res += ' ' + str(args[i])
		logger(nowString() + ' |' + res);
	}
	
	var log = function(){ return doEmitLog(arguments, underlyingLoggers.default), log };
	
	var underlyingLoggers = {};
	
	log.setUnderlyingLogger = (fn, type) => underlyingLoggers[type || 'default'] = fn;
	log.getUnderlyingLogger = (type) => underlyingLoggers[type || 'default'];
	log.setUnderlyingLogger(Addict.getEnvironment().type === 'node'? str => console.error(str): str => console.log(str), 'default');
	log.setUnderlyingLogger(Addict.getEnvironment().type === 'node'? str => console.error(str): str => console.warn(str), 'warn');
	log.setUnderlyingLogger(str => console.error(str), 'error');
	log.getPrefixLength = (type) => {
		type = type || 'default';
		var oldLogger = underlyingLoggers[type],
			len = -1;
		log.underlyingLogger[type] = str => len = str.length;
		log('');
		log.underlyingLogger[type] = oldLogger;
		return len;
	}
	log.warn = function(){ return doEmitLog(arguments, underlyingLoggers.warn), log.warn }
	log.error = function(){ return doEmitLog(arguments, underlyingLoggers.error), log.error }
	
	return log;
	
});