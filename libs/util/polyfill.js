pkg('util.polyfill', () => {
	
	const Addict = pkg('meta.addict');
	
	const fills = {
		global: {
			setImmediate: func => setTimeout(func, 0),
			clearImmediate: id => clearTimeout(id)
		}
	}
	
	return () => {
		
		const glob = Addict.getEnvironment().getGlobal();
		Object.keys(fills.global).forEach(x => (x in glob) || (glob[x] = fills.global[x]));
		
	}
	
});