pkg('global', () => {
	
	var Addict = pkg('meta.addict'),
		RejectionHandler = pkg('util.rejection.handler'),
		Test = pkg('meta.test');
	
	var directInclusions = {
		'test': Test,
		'expect': Test.expect,
		'expectException': Test.expectException,
		'fail': pkg('util.fail'),
		'log': pkg('util.log'),
		"sleep": pkg("util.sleep")
	};
		
	
	pkg('util.class').modifyPrototype(); 
	
	var otherGlobalModifications = [
		pkg('util.polyfill'),
		pkg('util.timer.fix'),
		pkg('coll.stream.array.proto'),
		pkg('coll.object.constr'),
		pkg('coll.conversions'),
		pkg('coll.array.proto'),
	];
	
	return () => {
		RejectionHandler(error => {
			if(typeof(error) === 'object' && error && error.stack)
				log.error('Unhandled promise rejection: ' + error.stack);
			else if(error){
				try {
					error = JSON.stringify(error);
				} catch(_){}
				log.error('Unhandled promise rejection: ' + error);
			}
			else
				log.error('Unhandled promise rejection. No additional information is supplied.'); // shit happens
			typeof(process) !== "undefined" && process.exit(1);
		});
		var glob = Addict.getEnvironment().getGlobal();
		Object.keys(directInclusions).forEach(k => glob[k] = directInclusions[k]);
		otherGlobalModifications.forEach(x => x());
	}
});