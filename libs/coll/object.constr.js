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
			},
			mix: function(base, varargMixins){
				(typeof(base) !== 'object' || base === null) && fail('Expected value to mix into to be non-null object; got ' + base + ' instead.');
				for(var i = 1; i < arguments.length; i++){
					var mixin = arguments[i];
					Object.keys(mixin).forEach(k => base[k] = mixin[k]);
				}
			}
		}
		
		Object.keys(mods).forEach(k => Object[k] = mods[k]);
		
	}

})