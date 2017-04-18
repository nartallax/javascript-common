pkg('global', () => {
	
	var Addict = pkg('meta.addict'),
		Test = pkg('meta.test');
	
	var directInclusions = {
		'test': Test,
		'expect': Test.expect,
		'expectException': Test.expectException,
		'fail': pkg('util.fail'),
		'log': pkg('util.log')
	};
	
	var glob = Addict.getEnvironment().getGlobal();
	Object.keys(directInclusions).forEach(k => glob[k] = directInclusions[k]);
	
	// that's BAD, I know. but this package is only usable at definition time, so no much choice
	pkg('util.class').modifyPrototype(); 
	
	var otherGlobalModifications = [
		pkg('util.timer.fix'),
		pkg('coll.stream.array.proto'),
		pkg('coll.object.constr'),
		pkg('coll.conversions'),
		pkg('coll.array.proto'),
	];
	
	otherGlobalModifications.forEach(x => x());
	
	return null;
});