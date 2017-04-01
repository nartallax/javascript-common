// lazy async sequence
pkg('coll.stream.async', () => {
	
	var AsyncStream = function(hasNext, next){
		if(!(this instanceof AsyncStream)) return new AsyncStream(hasNext, next);
		
		if(typeof(hasNext) === 'function' && typeof(next) !== 'function'){
			next = hasNext;
			hasNext = () => true;
		}
		
		this.hasNext = hasNext;
		this.next = next;
		this.defaultThreadCount = 1;
		this.defaultBufferSizeMultiplier = 10;
	}
	
	AsyncStream.prototype = {
		setDefaultThreadCount: function(x){ this.defaultThreadCount = x; return this }, 
		setDefaultBufferSizeMultiplier: function(x){ this.defaultBufferSizeMultiplier = x; return this },
		
		async: function(){ return this },
		stream: function(cb){ return this.array(arr => cb(arr.stream())) },
		array: function(cb, arr){
			arr = arr || [];
			this.each(x => arr.push(x), () => cb(arr));
		},
		
		map: function(onValue, after, threadCount, bufferSize){
			(arguments.length < 3 || typeof(threadCount) !== 'number' || threadCount <= 0) && (threadCount = this.defaultThreadCount);
			(arguments.length < 4 || typeof(bufferSize) !== 'number' || bufferSize <= 0) && 
				(bufferSize = threadCount * this.defaultBufferSizeMultiplier);
			(onValue.length > 1) 
				|| fail('Callback takes not enough arguments! Expected no lesser than two (for value and callback-for-callback).');
			
			/*
			this.each()
			
			return new AsyncStream(
				cb => 
			);
			*/
		},
		
		each: function(onValue, after, threadCount, index){
			(onValue.length > 1) 
				|| fail('Callback takes not enough arguments! Expected no lesser than two (for value and callback-for-callback).');
			(arguments.length < 3 || typeof(threadCount) !== 'number' || threadCount <= 0) && (threadCount = this.defaultThreadCount);
			index = index || 0;
			
			
			this.hasNext(hasAtLeastOne => {
				if(!hasAtLeastOne) return after();
				
				var currentQuota = threadCount;
			
				var tryRunNext = () => {
					if(currentQuota <= 0 || !this.hasNext()) return;
					
					currentQuota -= 1;
					onValue(this.next(), () => {
						currentQuota += 1;
						(currentQuota === threadCount && !this.hasNext() && after)? (after(), (after = null)): tryRunNext();
					});
					
					tryRunNext();
				}
				
				tryRunNext();
			})
		}
	}
	
	AsyncStream.isAsyncStream = n => (n instanceof AsyncStream);
	
	return AsyncStream;
	
});