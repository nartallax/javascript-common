pkg('coll.conversions', () => {

	var Stream = pkg('coll.stream'),
		AsyncStream = pkg('coll.stream.async'),
		HeadAwareStream = pkg('coll.stream.head.aware'),
		HeadAwareAsyncStream = pkg('coll.stream.head.aware.async'),
		RingBuffer = pkg('coll.ring.buffer');
		
	// набор модификаций прототипов, которые позволяют конвертировать разные коллекции друг в друга
	
	return () => {
		
		Object.mix(Stream.prototype, {
			stream: function(){ return this },
			array: function(arr){ return this.reduce((arr, x) => (arr.push(x), arr), arr || []) },
			async: function(){ return new AsyncStream(cb => setImmediate(() => cb(this.hasNext())), () => this.next()) },
			headAware: function(){ return new HeadAwareStream(() => this.hasNext(), () => this.next())}
		});
		
		Object.mix(Array.prototype, {
			stream: function(){
				var i = 0;
				return new Stream(() => i < this.length, () => this[i++]);
			},
			array: function(arr){ return arr? arr.concat(this): this },
			async: function(){ return this.stream().async() },
			headAware: function(){ return this.stream().headAware() }
		});
		
		Object.mix(AsyncStream.prototype, {
			stream: function(cb){ this.array(arr => cb(arr.stream())) },
			array: function(cb, arr){
				this.checkValueHandler(cb, ['value'])
				arr = arr || [];
				this.each((x, cb) => cb(arr.push(x)), () => cb(arr));
			},
			async: function(){ return this },
			headAware: function(){ return new HeadAwareAsyncStream(cb => this.hasNext(cb), () => this.next()) }
		});
		
		Object.mix(HeadAwareStream.prototype, {
			headAware: function(){ return this }
		});
		
		Object.mix(HeadAwareAsyncStream.prototype, {
			headAware: function(){ return this }
		});
		
		Object.mix(RingBuffer.prototype, {
			stream: function(){
				var i = this.index,
					start = i,
					started = false;
					
				while(!(i in this.data) && (!started || i !== start)) {
					started = true;
					i = (i + 1) % this.size;
				}
				
				return new HeadAwareStream(
					() => (i !== start) || !started,
					() => {
						var res = this.data[i];
						started = true;
						i = (i + 1) % this.size;
						return res
					}
				);
			},
			array: function(){ return this.stream().array() },
			async: function(){ return this.stream().async() },
			headAware: function(){ return this.stream() }
		})
		
	}

});