pkg('util.fail', () => {
	
	var fail = (msg, inner) => {
		if(inner) msg += '\nInner exception: ' + inner;
		throw new Error(msg);
	}
	
	return fail;
	
});