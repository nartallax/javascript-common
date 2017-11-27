pkg('util.rejection.handler', () => {

	var Addict = pkg('meta.addict');
	
	return handler => {
		switch(Addict.getEnvironment().type){
			case 'node': return process.on('unhandledRejection', handler);
			case 'browser': return window.addEventListener('unhandledrejection', e => {
				e.preventDefault();
				handler(e.reason, e.promise)
			});
			default: throw new Error('Don\'t know how to setup default promise rejection handler in environment "' + Addict.getEnvironment().type + '".');
		}
	}

});