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
				var i = this.indices.clone(),
					start = i.head();
					
				while(!(i.head() in this.data) && (!started || i.head() !== start)) {
					started = true;
					i.next();
				}
				
				return new Stream(
					() => (i.head() !== start) || !started,
					() => this.data[i.next()]
				);
			}
		})
		
	}

});