pkg('util.rejection.handler', () => {

	var Addict = pkg('meta.addict');
	
	return handler => {
		switch(Addict.getEnvironment().type){
			case 'node': return process.on('unhandledRejection', handler);
			case 'browser': 
				let eHandler = e => {
					e.preventDefault();
					handler(e.reason, e.promise)
				}
				let eName = "unhandledrejection";
				return window.addEventListener? window.addEventListener(eName, eHandler): window.attachEvent(eName, eHandler);
			default: throw new Error('Don\'t know how to setup default promise rejection handler in environment "' + Addict.getEnvironment().type + '".');
		}
	}

});