// lazy async sequence
pkg('coll.stream.async', () => {
	
	var SeqBufRec = pkg('coll.sequental.buffer.rectifier'),
		ProdCon = pkg('util.producer.consumer');
	
	// асинхронный Stream. асинхронный в нем только hasNext(), next() - синхронный
	// в отличие от его синхронного предшественника, имеет ряд нюансов, связанных с асинхронным потреблением данных
	// например, правило, которое для стрима звучало как "не вызывай next(), не проверив сначала hasNext()"
	// для асинхронного звучит как "вызывай next() только синхронно после того как вызов hasNext() вернется"
	// так, при попытке нескольких потребителей одновременно использовать этот стрим, каждое значение будет уходить ровно одному
	var AsyncStream = function(hasNext, next){
		if(!(this instanceof AsyncStream)) return new AsyncStream(hasNext, next);
		
		if(typeof(hasNext) === 'function' && typeof(next) !== 'function'){
			next = hasNext;
			hasNext = cb => setImmediate(() => cb(true));
		}
		
		this.hasNext = hasNext;
		this.next = next;
	}
	
	AsyncStream.prototype = {
		defaultThreadCount: 1,
		defaultBufferSizeMultiplier: 3,
		
		checkValueHandler: (onValue, expectedArg, optionalArgs) => {
			optionalArgs || (optionalArgs = []);
			if(onValue.length < expectedArg.length){
				fail('Callback takes not enough arguments! Expected no lesser than ' + expectedArgs.length + 
					' (' + expectedArgs.concat(optionalArgs).join(', ') + ')');
			}
		},
		
		map: function(onValue, threadCount, bufferSize, index){
			(arguments.length < 2 || typeof(threadCount) !== 'number' || threadCount <= 0) && (threadCount = this.defaultThreadCount);
			(arguments.length < 3 || typeof(bufferSize) !== 'number' || bufferSize <= threadCount + 1) && 
				(bufferSize = Math.max(threadCount * this.defaultBufferSizeMultiplier, threadCount + 1));
			this.checkValueHandler(onValue, ['value', 'callback'], ['index']);
			
			index = index || 0;
			
			var pc = new ProdCon(),
				buffer = new SeqBufRec(value => {
					pc.supply(value)
					tryRunNext(); // тут это может понадобиться для того, чтобы вовремя закрыть pc
				});
			
			var runningThreadCount = 0;
			var isWaitingToRunNext = false;
			
			var tryRunNext = () => !pc.closeRequested() && !isWaitingToRunNext && (isWaitingToRunNext = true) && this.hasNext(hn => {
				isWaitingToRunNext = false;
				if(!hn){
					return runningThreadCount === 0 && buffer.size() === 0 && (pc.closeRequested() || pc.close());
				}
				if(buffer.size() + pc.size() >= bufferSize || runningThreadCount >= threadCount) return;
				
				runningThreadCount += 1;
				var valueIndex = buffer.indices.next();
				onValue(this.next(), mapped => {
					runningThreadCount -= 1;
					buffer.push(valueIndex, mapped);
					setImmediate(tryRunNext);
				}, index++);
				
				setImmediate(tryRunNext);
			});
			
			tryRunNext();
			
			pc.onConsumption(tryRunNext);
			
			return new AsyncStream(cb => pc.waitForStatus(cb), () => pc.consume());
		},
		
		each: function(onValue, after, threadCount, index){
			this.checkValueHandler(onValue, ['value', 'callback'], ['index']);
			(arguments.length < 3 || typeof(threadCount) !== 'number' || threadCount <= 0) && (threadCount = Math.max(this.defaultThreadCount, 1));
			
			var currentQuota = threadCount;
			
			var isWaitingToRunNext = false;
			var tryRunNext = () => (currentQuota > 0) && !isWaitingToRunNext && (isWaitingToRunNext = true) && this.hasNext(hn => {
				isWaitingToRunNext = false;
				if(!hn){
					return (currentQuota === threadCount) && after && (after(), (after = null));
				}
				
				currentQuota -= 1;
				var nextValue = this.next()
				onValue(nextValue, () => {
					currentQuota += 1;
					tryRunNext();
				}, index++);
				
				tryRunNext();
				
			});
			
			tryRunNext();
		},
		
		flatten: function(){ 
			var bufferValue = null;
			return new AsyncStream(
				cb => bufferValue? bufferValue.hasNext(hn => hn? cb(true): ((bufferValue = null), this.hasNext(cb))): this.hasNext(cb),
				() => (bufferValue || (bufferValue = this.next().async())).next()
			);
		},
		
		flatMap: function(cb, tc, bs, index){ return this.map(cb, tc, bs, index).flatten() },
		filter: function(cond, tc, bs, index){ 
			return this.flatMap((x, cb, index) => cond(x, isGood => cb(isGood? [x]: []), index), tc, bs, index) 
		},
		reduce: function(reducer, after, initialValue, index){
			this.checkValueHandler(onValue, ['reduce_base', 'reduce_arg', 'callback'], ['index']);
			
			var reduceFromInitial = v => {
				this.each((x, cb, index) => reducer(v, x, reduceResult => cb(v = reduceResult), index), () => after(v), 1, index);
			}
			
			if(arguments.length() < 2){
				this.hasNext(hn => {
					hn || fail('For reduce(), no initial value is provided nor have any data in stream to take as initial.');
					reduceFromInitial(this.next());
				})
			} else reduceFromInitial(initialValue);
		},
		
		sum: function(cb){ this.reduce((a, b, cb) => cb(a + b), cb, 0) },
		product: function(cb){ this.reduce((a, b, cb) => cb(a * b), cb, 1) },
		max: function(cb){ this.reduce((a, b, cb) => cb(a < b? b: a), cb) },
		min: function(cb){ this.reduce((a, b, cb) => cb(a < b? a: b), cb) },
		size:function(cb){ this.reduce((a, b, cb) => cb(a + 1), cb, 0) },
		
		append: function(other){
			other = other.async();
			
			var hasNext = cb => this.hasNext(hn => nh? cb(true): ((next = () => other.next()), (this.hasNext = (cb => other.hasNext(cb)))(cb))),
				next = () => this.next();
			
			return new AsyncStream(cb => hasNext(cb), () => next());
		},
		
		take: function(arg){
			if(typeof(arg) === 'function'){
				this.hasNext(hn => cb(hn? this.next(): undefined));
			} else if(typeof(arg) === 'number') {
				var i = 0, count = arg;
				
				return new AsyncStream(
					cb => (i >= count)? setImmediate(() => cb(false)): this.hasNext(cb), 
					() => (i++, this.next())
				);
			} else fail('Unexpected type of first argument: ' + typeof(arg) + ' (expected function or number)');
		},
		
		takeWhile: function(cond, index){ return this.headAware().takeWhile(cond, index) },
		
		drop: function(count){
			arguments.length < 1 && (count = 1);
			return new AsyncStream(
				cb => count < 0? setImmediate(() => cb(false)): this.hasNext(hn => cb(hn && count > 0)),
				() => (count--, this.next())
			);
		},
		
		dropWhile: function(cond, index){ 
			this.checkValueHandler(cond, ['value', 'callback'], ['index']);
			var foundGood = false;
			return this.filter((x, cb, index) => foundGood? setImmediate(() => cb(true)): cond(x, mustSkip => {
				mustSkip || (foundGood = true);
				cb(foundGood);
			}, index), index);
		},
		
		exists: function(cond, cb, index){ this.filter(cond, index).hasNext(cb) },
		tail: function(len, cb){
			if(arguments.length === 1 && typeof(len) === 'function'){
				cb = len;
				var v = undefined;
				this.each((x, cb) => cb(v = x), () => cb(v));
			} else {
			}
		}
	}
	
	AsyncStream.isAsyncStream = n => (n instanceof AsyncStream);
	
	return AsyncStream;
	
});