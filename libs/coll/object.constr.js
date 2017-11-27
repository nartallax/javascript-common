pkg('coll.object.constr', () => {

	var Stream = pkg('coll.stream');

	return () => {
		
		var mods = {
			values: obj => Object.keys(obj).map(k => obj[k]),
			pairs: obj => Object.keys(obj).map(k => [k, obj[k]]),
			pairStream: obj => Object.keys().stream().map(k => [k, obj[k]]),
			each: (obj, cb) => Object.keys(obj).each(k => cb(k, obj[k])),
			map: (obj, cb) => { 
				var result = {};
				Object.keys(obj).each(k => result[k] = cb(k, obj[k]))
				return result;
			},
			empty: obj => {
				for(var i in obj) return false;
				return true;
			}
		}
		
		Object.keys(mods).forEach(k => Object[k] = mods[k]);
		
	}

})