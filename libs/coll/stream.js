// lazy sequence
pkg('coll.stream', () => {
	
	var fail = pkg('util.fail');
	
	var Stream = function(hasNext, next){
		if(!(this instanceof Stream)) return new Stream(hasNext, next);
		
		if(typeof(hasNext) === 'function' && typeof(next) !== 'function'){
			next = hasNext;
			hasNext = () => true;
		}
		
		this.hasNext = hasNext;
		this.next = next;
	}

	Stream.prototype = {
		stream: function(){ return this },
		array: function(arr){ return this.reduce((arr, x) => (arr.push(x), arr), arr || []); },
		
		map: function(proc, index){
			index = index || 0;
			return new Stream(() => this.hasNext(), () => proc(this.next(), index++)) 
		},
		flatMap: function(proc, index){
			index = index || 0;
			var buffer = [].stream();
			var result = new Stream(
				() => buffer.hasNext() || this.hasNext(),
				() => buffer.hasNext()? buffer.next(): ((buffer = proc(this.next(), index++).stream()), result.next())
			);
			
			return result;
		},
		flatten: function(){ return this.flatMap(x => x) },
		filter: function(proc, index){
			index = index || 0;
			var next, nextIndex, nextIsLoaded = false;
			var loadNext = () => nextIsLoaded? true: this.hasNext()? (((next = this.next()), (nextIndex = index++)), nextIsLoaded = true): false,
				takeNext = () => (loadNext(), (nextIsLoaded = false), next),
				loadNextApplicable = () => {
					while(loadNext()) {
						if(proc(next, nextIndex)) return true;
						takeNext();
					}
					return false;
				}
			
			return new Stream(loadNextApplicable, () => loadNextApplicable()? takeNext(): undefined)
		},
		
		each: function(proc, index){ 
			index = index || 0; 
			while(this.hasNext()) proc(this.next(), index++) 
		},
		reduce: function(proc, value, index){ 
			index = index || 0; 
		
			if(arguments.length === 1){
				this.hasNext() || fail('Failed to reduce an empty stream without initial value.');
				value = this.next();
				index++;
			}
			
			return this.each(x => value = proc(value, x, index++)), value 
		},
		
		zipWithIndex: function(i){ return (i = (i || 0)), new Stream(this.hasNext, () => [i++, this.next()]) },
		sum: function(){ return this.reduce((a, b) => a + b, 0) },
		product: function(){ return this.reduce((a, b) => a * b, 1) },
		max: function(){ return this.reduce((a, b) => a > b? a: b, 0) },
		min: function(){ return this.reduce((a, b) => a < b? a: b, 0) },
		
		append: function(other){ 
			other = other.stream();
		
			var next = () => this.next(),
				hasNext = () => this.hasNext()? true: ((next = () => other.next()), (hasNext = () => other.hasNext()))();
				
			return new Stream(() => hasNext(), () => next());
		},
		
		take: function(count){ 
			if(arguments.length < 1){
				return this.hasNext()? this.next(): undefined;
			} else {
				var i = 0;
				return new Stream(() => this.hasNext() && (i < count), () => (i++, this.next()));
			}
		},
		takeWhile: function(cond, index){ // warning: will loose first non-matching element from source stream
			index = index || 0;
			var next, nextIndex, nextIsLoaded = false;
			var loadNext = () => nextIsLoaded? true: this.hasNext()? (((next = this.next()), (nextIndex = index++)), nextIsLoaded = true): false,
				takeNext = () => (loadNext(), (nextIsLoaded = false), next);
			
			return new Stream(() => loadNext() && cond(next, nextIndex), () => takeNext())
		},
		drop: function(count){
			arguments.length < 1 && (count = 1);
			while(count-->0 && this.hasNext()) this.next();
			return this;
		},
		dropWhile: function(cond, index){
			index = index || 0;
			while(this.hasNext()){
				var v = this.next();
				if(!cond(v, index++)){
					return [v].stream().append(this); // not loosing the first non-matching element
				}
			}
			return this; // this is empty anyway
		},
		
		exists: function(cond, index){
			index = index || 0;
			while(this.hasNext()) if(cond(this.next(), index)) return true;
			return false;
		},
		
		tail: function(len){ // last N elements in array or last element
			if(arguments.length < 1){
				var res = undefined;
				this.each(x => res = x);
				return res;
			} else { // TODO: optimize by circle buffer?
				var res = [];
				this.each(x => {
					res = res.length >= len? res.slice(1, len): res;
					res.push(x);
				});
				return res;
			}
		},
		
		find: function(proc, index){ return this.filter(proc, index).take(); },
		findIndex: function(proc, index){
			this.filter((x, i) => ((index = i), proc(x, i)), index);
			return index;
		},
		
		groupBy: function(arg, index){
			if(typeof(arg) === 'number') return this.groupByCount(arg)
			if(typeof(arg) === 'function' && arg.length === 1) return this.groupByAttribute(arg, index);
			if(typeof(arg) === 'function' && (arg.length === 2 || arg.length === 3)) return this.groupByComparison(arg, index);
			fail('Could not determine what overload to call of groupBy method.');
		},
		groupByCount: function(size){
			var i;
			return new Stream(
				() => this.hasNext(),
				() => ((i = 0), new Stream(
					() => this.hasNext() && i < size,
					() => (i++, this.next())
				))
			);
		},
		groupByAttribute: function(getAttr, index){
			return this.groupByComparison((a, b, index) => getAttr(a, index) === getAttr(b, index + 1), index);
		},
		groupByComparison: function(compare, index){
			index = index || 0;
			if(!this.hasNext()) return this; // it doesn't matter what exactly stream we are returning if it's empty
			var head, prevIndex;
			var updateHead = () => ((head = this.next()), (prevIndex = index++)),
				checkedUpdateHead = () => (hasHead = this.hasNext()) && updateHead()
			updateHead();
			
			if(!this.hasNext) return [[head].stream()].stream(); // corner-case - one value stream
			var prev = head;
			head = this.next();
			var hasHead = true, hasPrev = true; // "has" === "have non-outputted value in buffer"
			
			return new Stream(
				() => hasHead || hasPrev,
				() => ((hasPrev || ((prev = head), (hasPrev = true), checkedUpdateHead())), new Stream(
					() => hasPrev || (hasHead && compare(prev, head, prevIndex)),
					() => {
						if(hasPrev) return (hasPrev = false), prev;
						
						prev = head;
						checkedUpdateHead();
						return prev;
					}
				))
			);
		}
	}

	Stream.nums = (start, end, step) => {
		step = step || (start <= end? 1: -1);
		return new Stream(step > 0? (() => start <= end): (() => start >= end), () => ((start += step), start - step));
	}
	
	Stream.isStream = n => (n instanceof Stream);
	
	return Stream;
	
});