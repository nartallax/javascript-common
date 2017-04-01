pkg('global', () => {
	
	var Addict = pkg('meta.addict');
	
	var directInclusions = {
		'fail': pkg('util.fail'),
		'log': pkg('util.log')
	};
	
	var otherGlobalModifications = [
		pkg('coll.stream.array.proto'),
		pkg('coll.object.constr'),
		pkg('coll.array.proto'),
	];
	
	return () => {
		var glob = Addict.getEnvironment().getGlobal();
		Object.keys(directInclusions).forEach(k => glob[k] = directInclusions[k]);
		otherGlobalModifications.forEach(x => x());
	}
	
});