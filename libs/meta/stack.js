pkg('meta.stack', () => {

	var reg = /^\s*(?:at\s)?\s*(\S+)\s+.*?(?:\[as\s(\S+)\])?.*?\((.*?):(\d+):(\d+)\)\s*$/,
		pathReg = /[\\\/]([^\\\/]+\.[Jj][Ss])$/;

	var StackTraceElement = function(fnName, fnPseudo, module, line, col){
		this.functionName = fnName || null,
		this.functionPseudonym = fnPseudo || null,
		this.module = module || null,
		this.line = line || null,
		this.column = col || null
	}
	
	StackTraceElement.fromLine = line => {
		if(!line) return null;
		var parts = line.match(reg);
		return parts? new StackTraceElement(parts[1], parts[2], parts[3], parts[4], parts[5]): null;
	}
	
	StackTraceElement.prototype = {
		toString: function(){
			return 'at ' + (this.functionName || '???') +
				(this.functionPseudonym? ' [as ' + this.functionPseudonym + ']': '') +
				(' (' + (this.module || '???') + ':' + (this.line || '???') + ':' + (this.column || '???') + ')')
		},
		
		getSimpleModuleName: function(){
			if(!this.module) return '???';
			return this.module.match(pathReg)? this.module.match(pathReg)[1]: this.module;
		},
		
		toShortString: function(){
			return this.getSimpleModuleName() + ':' + (this.line || '???') + ':' + (this.column || '???');
		}
	}
	
	// функция, позволяющая получать структурированный callstack
	var getStackTrace = smth => {
		
		smth || (smth = new Error());
		smth && smth.stack && (smth = smth.stack + '');
		smth && typeof(smth) === 'string' && (smth = smth.split('\n'));
		
		return smth.map(StackTraceElement.fromLine).filter(l => l)
	}
	
	return getStackTrace;

});