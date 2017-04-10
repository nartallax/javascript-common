// a sample app
require('../../javascript-common/libs/meta/addict.js')
	.resolvers(['node', {'../../javascript-common/libs': '', './app': 'appname'}])
	.main(() => {
	
		pkg('global')();
		
		var getCallStack = pkg('meta.stack');
				
		var stream = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].async();
		stream.groupBy((a, cb) => cb(~~(a / 5))).map((x, cb) => x.array(cb)).array(x => log(x));
		
		
		/*
		var stream = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
			.flatMap(x => [x, x * x, x * x * x])
			.filter(x => x % 2);
		
		log(stream.tail(10).array());
		*/
		
	});