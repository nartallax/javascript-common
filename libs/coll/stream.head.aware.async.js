pkg('coll.stream.head.aware.async', () => {
	
	var AsyncStream = pkg('coll.stream.async'),
		Queue = pkg('coll.queue');
	
	// то же самое, что coll.stream.head.aware, только асинхронный как coll.stream.async
	// head() - синхронный, только после hasNext()
	var HeadAwareAsyncStream = function(hasNext, next){
		this._hn = hasNext;
		this._n = next;
		this._hasHead = false;
		this._head = null
		this._loadcb = new Queue();
		this._loading = false;
	}
	
	HeadAwareAsyncStream.prototype = AsyncStream.extend({
		forceStartLoad: function(){
			this._loading || ((this._loading = true), this._hn(hn => {
				this._loading = false;
				hn && ((this._head = this._n()),(this._hasHead = true));
				
				if(!hn){
					return this._loadcb.each(x => x(false));
				} else {
					while(this._hasHead && this._loadcb.hasNext()) this._loadcb.pop()(true);
					this._loadcb.hasNext() && this.forceStartLoad();
				}
			}));
		},
		
		loadHead: function(cb){
			if(this._hasHead){
				setImmediate(() => this._hasHead? cb(true): this.loadHead(cb));
				return;
			}
			
			this._loadcb.push(cb);
			this.forceStartLoad();
		},
		
		hasNext: function(cb){ return this.loadHead(cb) },
		next: function(){
			var result = this._head;
			this._hasHead = false;
			this._head = null;
			return result;
		},
		
		head: function(){ return this._head },
		
		takeWhile: function(cond, index){
			this.checkValueHandler(cond, ['value', 'callback'], ['index']);
			index = index || 0;
			return new AsyncStream(
				cb => this.loadHead(hn => !hn? cb(false): cond(this._head, cb, index++)),
				() => this.next()
			);
		},
		
		groupByComparison: function(compare, index){
			this.checkValueHandler(compare, ['value_a', 'value_b', 'callback'], ['index'])
			
			var prev = null, hasPrev = false;
			
			return new AsyncStream(
				cb => {
					this.loadHead(hn => cb(hn))
				},
				() => this.takeWhile((x, cb, i) => {
					if(!hasPrev) {
						hasPrev = true;
						prev = x;
						setImmediate(() => cb(true))
					} else {
						index = i;
						compare(prev, x, isGood => {
							isGood? ((prev = x), cb(true)): ((hasPrev = false), (prev = null), cb(false))
						}, index - 1);
					}
				}, index)
			);
		}
	});
	
	return HeadAwareAsyncStream;
});