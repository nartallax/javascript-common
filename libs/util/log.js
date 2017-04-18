pkg('util.log', () => {
	
	var nowString = pkg('util.time').nowString,
		Stack = pkg('meta.stack');
		
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

	var whitePad = (str, maxLen) => str.length >= maxLen? str: str + (new Array(maxLen - str.length + 1).join(' '));
	var maxModuleLength = 0;
	
	var log = function(){
		var args = arguments, res = '';
		
		for(var i = 0; i < args.length; i++) res += ' ' + str(args[i])
			
		var mod = Stack()[2].getSimpleModuleName();
		mod.length > maxModuleLength? (maxModuleLength = mod.length): (mod = whitePad(mod, maxModuleLength));
		
		log.underlyingLogger(nowString() + ' | ' + mod + ' |' + res);
		
		return log;
	};
	
	log.setUnderlyingLogger = fn => log.underlyingLogger = fn;
	log.setUnderlyingLogger(str => console.error(str));
	
	return log;
	
})