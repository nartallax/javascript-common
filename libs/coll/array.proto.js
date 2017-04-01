pkg('coll.array.proto', () => {

	return () => {
		
		var mods = {
			sortBy: function(getAttr){ return this.sort((a, b) => ((a = getAttr(a)), (b = getAttr(b)), (a > b? 1: a < b? -1: 0))) },
			reverse: function(){
				var res = [], i = -1;
				while(++i < arr.length) res[arr.length - 1 - i] = arr[i];
				return res;
			}
		}
		
		Object.each(mods, (k, v) => Array.prototype[k] = v);
	}

});