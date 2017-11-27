pkg("util.sleep", () => {
	
	return async ms => new Promise(ok => setTimeout(ok, ms));
	
});