pkg('global', () => {
	
	var Addict = pkg('meta.addict');
	
	var directInclusions = {
		'fail': pkg('util.fail'),
		'log': pkg('util.log')
	};
	
	// that's BAD, I know. but this package is only usable at definition time, so no much choice
	pkg('util.class').modifyPrototype(); 
	
	var otherGlobalModifications = [
		pkg('coll.stream.array.proto'),
		pkg('coll.object.constr'),
		pkg('coll.conversions'),
		pkg('coll.array.proto'),
	];
	
	return () => {
		var glob = Addict.getEnvironment().getGlobal();
		Object.keys(directInclusions).forEach(k => glob[k] = directInclusions[k]);
		otherGlobalModifications.forEach(x => x());
	}
	
});