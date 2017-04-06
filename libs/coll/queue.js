pkg('coll.queue', () => {
	
	var CircularIndexGen = pkg('coll.number.generators').circular,
		Stream = pkg('coll.stream');
	
	// this will silently fail if stored object count will be greater than 2^53
	var Queue = function(){
		this.indices = new CircularIndexGen();
		this.tail = this.indices.head();
		this.data = {};
		this.length = 0;
	}
	
	var enq = function(v){
		this.data[this.indices.head()] = v;
		this.indices.next();
		this.length++;
	}
	
	var deq = function(){
		(this.length < 1) && fail("Could not dequeue from empty queue.")
		var res = this.data[this.tail];
		delete this.data[this.tail];
		this.tail = this.indices.next(this.tail);
		this.length--;
		return res;
	}
	
	var peek = function(){
		(this.length < 1) && fail("Could not peek on empty queue.")
		return this.data[this.head];
	}
	
	var inc = function(i){ return i < this.maxIndex? i + 1: -this.maxIndex };
	
	Queue.prototype = Stream.extend({
		push: enq,
		enq: enq,
		enqueue: enq,
		
		pop: deq,
		deq: deq,
		dequeue: deq,
		
		peek: peek,
		head: peek,
		
		next: deq,
		hasNext: function(){ return this.length > 0 },
		
		size: function(){ return this.length }
	})
	
	return Queue;
	
});