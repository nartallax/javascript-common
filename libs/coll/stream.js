// lazy sequence
pkg('coll.stream', () => {
	
	var fail = pkg('util.fail');
	var RingBuffer = pkg('coll.ring.buffer');
	
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
		toString: function(){ return "Stream" },
		
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
		filter: function(proc, index){ return this.flatMap((x, i) => proc(x, i)? [x]: []) },
		
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
		
		sum: function(){ return this.reduce((a, b) => a + b, 0) },
		product: function(){ return this.reduce((a, b) => a * b, 1) },
		max: function(){ return this.reduce((a, b) => a > b? a: b) },
		min: function(){ return this.reduce((a, b) => a < b? a: b) },
		size: function(){ return this.reduce((a, b) => a + 1, 0) },
		
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
			return this.headAware().takeWhile(cond, index);
		},
		drop: function(count){
			var started = false;
			arguments.length < 1 && (count = 1);
			return new Stream(
				() => {
					if(!started){
						started = true;
						while(count-- > 0 && this.hasNext()) this.next();
					}
					
					return this.hasNext();
				},
				() => this.next()
			);
		},
		dropWhile: function(cond, index){ return this.headAware().dropWhile(cond, index) },
		
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
				if(len < 1){
					return new Stream(() => false, () => fail('Calling next() on stream returned false as hasNext() value is not allowed.'))
				} else {
					var rb = new RingBuffer(len);
					this.each(x => rb.push(x));
					return rb.stream();
				}
			}
		},
		
		find: function(proc, index){ return this.filter(proc, index).take(); },
		findIndex: function(proc, index){
			this.filter((x, i) => ((index = i), proc(x, i)), index).take();
			return index;
		},
		
		// результат группировки - также стримы
		// предполагается, что каждый стрим будет потреблен до конца до того, как будет запрошен следующий
		groupBy: function(arg, index){
			if(typeof(arg) === 'number') return this.groupByCount(arg)
			if(typeof(arg) === 'function' && arg.length === 1) return this.groupByAttribute(arg, index);
			if(typeof(arg) === 'function' && (arg.length === 2 || arg.length === 3)) return this.groupByComparison(arg, index);
			fail('Could not determine what overload of groupBy method to call.');
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
		// по-хорошему, это надо бы вынести в head-aware стрим
		// но это и так неплохо получилось, так что пусть будет здесь
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
	
	/*
	//["toString","map","flatMap","flatten","filter","each","reduce","sum","product","max","min","size","append","take","takeWhile","drop","dropWhile","exists","tail","find","findIndex","groupBy","groupByCount","groupByAttribute","groupByComparison","stream","array","async","headAware"]
	test("map", () => expect(["first", "second", "third"].stream().map(x => x.substr(0, 2)).array().join(',') === 'fi,se,th'));
	test("flatMap", () => {
		expect(["first", "second", "third"].stream().flatMap(x => [x.substr(0, 2), x.substr(3, 2)]).array().join(',') === 'fi,st,se,on,th,rd')
	});
	test('flatten', () => expect([["fi", "st"], ["se","nd"], ["th", "rd"]].stream().flatten().array().join(',') === 'fi,st,se,nd,th,rd'))
	test('filter', () => expect(["first", "second", "third"].stream().filter(x => x.length % 2).array().join(',') === 'first,third'));
	test('each', () => {
		var res = '';
		['first', 'second', 'third'].stream().each(x => res = (res? res + ',': res) + x);
		expect(res === 'first,second,third');
	});
	test('reduce', () => expect(['first', 'second', 'third'].stream().reduce((a, b) => a + ',' + b) === 'first,second,third'));
	test('size', () => expect(['first', 'second', 'third'].stream().size() === 3));
	test('append', () => expect([1, 3, 5].stream().append([2, 4, 6].stream()).array().join(',') === '1,3,5,2,4,6'));
	test('take', () => {
		expect([1, 3, 5, 2, 4, 6].stream().take(10).array().join(',') === '1,3,5,2,4,6')
		expect([1, 3, 5, 2, 4, 6].stream().take(4).array().join(',') === '1,3,5,2')
		expect([1, 3, 5, 2, 4, 6].stream().take(1).array().join(',') === '1')
		expect([1, 3, 5, 2, 4, 6].stream().take(0).array().join(',') === '')
		expect([1, 3, 5, 2, 4, 6].stream().take(-5).array().join(',') === '')
	});
	test('takeWhile', () => {
		expect([1, 3, 5, 2, 4, 6].stream().takeWhile(x => x < 6).array().join(',') === '1,3,5,2,4')
		expect([1, 3, 5, 2, 4, 6].stream().takeWhile(x => x < 5).array().join(',') === '1,3')
		expect([1, 3, 5, 2, 4, 6].stream().takeWhile(x => x !== 2).array().join(',') === '1,3,5')
	});
	test('drop', () => {
		expect([1, 3, 5, 2, 4, 6].stream().drop(10).array().join(',') === '')
		expect([1, 3, 5, 2, 4, 6].stream().drop(4).array().join(',') === '4,6')
		expect([1, 3, 5, 2, 4, 6].stream().drop(1).array().join(',') === '3,5,2,4,6')
		expect([1, 3, 5, 2, 4, 6].stream().drop(0).array().join(',') === '1,3,5,2,4,6')
		expect([1, 3, 5, 2, 4, 6].stream().drop(-5).array().join(',') === '1,3,5,2,4,6')
	});
	test('dropWhile', () => {
		expect([1, 3, 5, 2, 4, 6].stream().dropWhile(x => x < 6).array().join(',') === '6')
		expect([1, 3, 5, 2, 4, 6].stream().dropWhile(x => x < 5).array().join(',') === '5,2,4,6')
		expect([1, 3, 5, 2, 4, 6].stream().dropWhile(x => x !== 2).array().join(',') === '2,4,6')
	});
	test('exists', () => {
		expect([1, 3, 5, 2, 4, 6].stream().exists(x => x > 4 && (x % 2) === 0))
		expect(![1, 3, 5, 2, 4, 6].stream().exists(x => x < 2 && (x % 2) === 0))
	});
	test('tail', () => {
		expect([1, 3, 5, 2, 4, 6].stream().tail() === 6)
		expect([].stream().tail() === undefined)
		
		expect([1, 3, 5, 2, 4, 6].stream().tail(10).array().join(',') === "1,3,5,2,4,6")
		expect([1, 3, 5, 2, 4, 6].stream().tail(3).array().join(',') === "2,4,6")
		expect([1, 3, 5, 2, 4, 6].stream().tail(5).array().join(',') === "3,5,2,4,6")
		expect([1, 3, 5, 2, 4, 6].stream().tail(0).array().join(',') === "")
		expect([1, 3, 5, 2, 4, 6].stream().tail(-5).array().join(',') === "")
	});
	test('find', () => expect([1, 3, 5, 2, 4, 6].stream().find(x => x > 3 && x % 2 === 0) === 4));
	test('findIndex', () => expect([1, 3, 5, 2, 4, 6].stream().findIndex(x => x > 1 && x % 2 === 0) === 3));
	test('groupBy', () => {
	})
	*/
	Stream.isStream = n => (n instanceof Stream);
	
	return Stream;
	
});