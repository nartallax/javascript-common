pkg("global.tiny", () => {
	/* same as global, just without innecessary bloat */
	
	var Addict = pkg('meta.addict'),
		RejectionHandler = pkg('util.rejection.handler'),
		Polyfill = pkg("util.polyfill")
	
	var directInclusions = {
		"fail": pkg("util.fail"),
		"log": pkg("util.log")
	};
	
	return () => {
		Polyfill();
		RejectionHandler(error => {
			if(typeof(error) === 'object' && error && error.stack)
				log.error('Unhandled promise rejection: ' + error.stack);
			else {
				try {
					error = JSON.stringify(error);
				} catch(_){}
				log.error('Unhandled promise rejection: ' + error);
			}
			typeof(process) !== "undefined" && process.exit(1);
		});
		var glob = Addict.getEnvironment().getGlobal();
		Object.keys(directInclusions).forEach(k => glob[k] = directInclusions[k]);
	}
});