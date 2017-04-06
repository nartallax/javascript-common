// a sample app
require('../../javascript-common/libs/meta/addict.js')
	.resolvers(['node', {'../../javascript-common/libs': '', './app': 'appname'}])
	.main(() => {
	
		pkg('global')();
		
		var getCallStack = pkg('meta.stack');
		
		var stream = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
			.async()
			.flatMap((x, cb) => {
				log('running for ' + x);
				setTimeout(() => {
					log('done for ' + x);
					cb([x, x * x, x * x * x])
				}, ~~(Math.random() * 500))
			}, 3, 3)
			.filter((x, cb) => cb(x % 2))
			
		stream.array(arr => log(arr));
		stream.array(arr => log(arr));
		/*
		var stream = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
			.flatMap(x => [x, x * x, x * x * x])
			.filter(x => x % 2);
		
		log(stream.array());
		*/
		
	});