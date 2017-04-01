// a sample app
require('../../javascript-common/libs/meta/addict.js')
	.resolvers(['node', {'../../javascript-common/libs': '', './app': 'appname'}])
	.main(() => {
	
		pkg('global')();
		
		log([0,1,2,3,4,5,6,7,8,9, 0, 10, 10].groupBy(3));
	
	});