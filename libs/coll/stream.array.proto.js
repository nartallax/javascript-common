// a set of modification to array prototype that maintains stream's interface on array
pkg('coll.stream.array.proto', () => {
	
	var Stream = pkg('coll.stream');
	
	var mods = {
		map: function(proc, index){
			index = index || 0;
			var result = [], i = -1;
			while(++i < this.length) result.push(proc(this[i], index++));
			return result;
		},
		
		flatMap: function(proc, index){
			index = index || 0;
			var result = [], i = -1;
			while(++i < this.length) proc(this[i], index++).each(x => result.push(x));
			return result;
		},
		
		flatten: function(){ return this.flatMap(x => x) },
		filter: function(proc, index){ 
			index = index || 0;
			var result = [], i = -1;
			while(++i < this.length) proc(this[i], index++) && result.push(this[i]);
			return result;
		},
		
		each: function(proc, index){
			index = index || 0;
			var i = -1;
			while(++i < this.length) proc(this[i], index++);
		},
		
		reduce: function(proc, value, index){
			index = index || 0;
			var i = -1;
			
			if(arguments.length === 1){
				this.length === 0 && fail('Failed to reduce an empty array without initial value.');
				value = this[0];
				i++;
				index++;
			}
			
			while(++i < this.length) value = proc(value, this[i], index++);
			return value;
		},
		
		zipWithIndex: function(index){ 
			index = index || 0;
			var i = -1, result = [];
			while(++i < this.length) result.push([index++, this[i]]);
			return result;
		},
		sum: function(){ return this.reduce((a, b) => a + b, 0) },
		product: function(){ return this.reduce((a, b) => a * b, 1) },
		max: function(){ return this.reduce((a, b) => a > b? a: b) },
		min: function(){ return this.reduce((a, b) => a < b? a: b) },
		size: function(){ return this.length },
		
		append: function(other){ return this.concat(other.array()) },
		take: function(count){ return arguments.length < 1? this[0]: this.slice(0, count < 0? 0: count); },
		takeWhile: function(cond, index){
			index = index || 0;
			var i = -1, result = [];
			while(++i < this.length && cond(this[i], index++)) result.push(this[i]);
			return result;
		},
		
		drop: function(count){
			arguments.length < 1 && (count = 1);
			return this.slice(count < 0? 0: count);
		},
		dropWhile: function(cond, index){
			index = index || 0;
			var i = -1, result = [];
			while(++i < this.length && cond(this[i], index++)){}
			return this.slice(i);
		},
		
		exists: function(cond, index){
			index = index || 0;
			var i = -1;
			while(++i < this.length) if(cond(this[i], index++)) return true;
			return false;
		},
		
		tail: function(len){ return arguments.length < 1? this[this.length - 1]: this.slice(this.length <= len? 0: this.length - len) },
		
		find: function(cond, index){
			index = index || 0;
			var i = -1;
			while(++i < this.length) if(cond(this[i], index++)) return this[i];
			return undefined;
		},
		findIndex: function(cond, index){
			index = index || 0;
			var i = -1;
			while(++i < this.length) if(cond(this[i], index++)) return index;
			return undefined;
		},
		
		groupBy: Stream.prototype.groupBy,
		groupByCount: function(size){
			var i = 0, result = [];
			while(i < this.length) result.push(this.slice(i, i += size));
			return result;
		},
		groupByAttribute: Stream.prototype.groupByAttribute,
		groupByComparison: function(compare, index){
			index = index || 0;
			if(this.length === 0) return [];
			if(this.length === 1) return [[this[0]]];
			
			var i = 0, result = [], subres = [this[0]];
			result.push(subres);
			while(++i < this.length){
				if(!compare(this[i - 1], this[i], index++)){
					subres = [];
					result.push(subres);
				}
				
				subres.push(this[i]);
			}
			
			return result;
		}
	}
	
	return () => {
		
		var requiredMods = Object.keys(Stream.prototype);
		
		requiredMods
			.map(name => {
				Array.prototype[name] = mods[name];
			})
		
	};
	
});