pkg('util.polyfill', () => {
	
	const Addict = pkg('meta.addict');
	
	const fills = {
		global: {
			setImmediate: func => setTimeout(func, 0),
			clearImmediate: id => clearTimeout(id)
		},
		
		Object: {
			keys: obj => {
				let result = [];
				for(let k in obj)
					if(obj.hasOwnProperty(k))
						result.push(k);
				return result;
			}
		},
		
		ArrayProto: {
			forEach: function(cb){
				for(var i = 0; i < this.length; i++)
					cb(this[i], i, this);
			}
		}
	}
	
	let fill = (fills, target) => {
		for(let k in fills)
			(k in target) || (target[k] = fills[k])
	}
	
	return () => {
		fill(fills.Object, Object);
		fill(fills.ArrayProto, Array.prototype);
		fill(fills.global, Addict.getEnvironment().getGlobal());
	}
	
});