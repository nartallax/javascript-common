pkg('coll.object.constr', () => {

	var Stream = pkg('coll.stream');

	return () => {
		
		var mods = {
			values: function(obj){ return Object.keys(obj).map(k => obj[k]) },
			pairs: function(obj){ return Object.keys(obj).map(k => [k, obj[k]]) },
			pairStream: function(obj){ return Object.keys().stream().map(k => [k, obj[k]]) },
			each: function(obj, cb){ Object.keys(obj).each(k => cb(k, obj[k])) },
			map: function(obj, cb){ 
				var result = {};
				Object.keys(obj).each(k => result[k] = cb(k, obj[k]))
				return result;
			}
		}
		
		Object.keys(mods).forEach(k => Object[k] = mods[k]);
		
	}

})