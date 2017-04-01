pkg('util.log', () => {
	var nowString = pkg('util.time').nowString;

	var str = smth => {
		switch(typeof(smth)) {
			case "function":return "[some function]";
			case "object":
				if(smth.message) 
					return smth.message; // for exceptions
				if(typeof(smth.toString) === 'function' && smth.toString !== Object.prototype.toString && smth.toString !== Array.prototype.toString)
					return smth.toString()
				return JSON.stringify(smth);
			case "boolean":	return smth? 'true': 'false';
			default: return smth + '';
		}
	}

	var log = function(){
		var args = arguments, res = '';
		
		for(var i = 0; i < args.length; i++) res += ' ' + str(args[i])
		
		log.underlyingLogger(nowString() + ' |' + res);
		
		return log;
	};
	
	log.setUnderlyingLogger = fn => log.underlyingLogger = fn;
	log.setUnderlyingLogger(str => console.error(str));
	
	return log;
	
})