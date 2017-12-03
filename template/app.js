// a sample app 
require('../../javascript-common/libs/meta/addict.js')
	.resolvers(['node', {'../../javascript-common/libs': '', './app': 'appname'}])
	.main(() => {
		pkg('global')();
		process.chdir(__dirname);
		
		const cli = new (pkg('util.cli'))({
			help: 	{ alias: 'h', isHelp: true },
			config: { alias: 'c', type: 'string', default: 'config.json' }
		});
		
		const cliArgs = cli.parse(process.argv);
		
		if(cliArgs.help){
			cli.printHelp();
		} else {
			let Event = require("util.event");
			(async () => {
				log("Hello world!");
				
				let termHandler = async () => {
					log("Goodbye.");
					process.exit(0);
				}
				process.on('SIGTERM', termHandler);
				process.on('SIGINT', termHandler);
			})();
		}
	
	});
