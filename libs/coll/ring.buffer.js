pkg('coll.ring.buffer', () => {

	var CircularIndexGen = pkg('coll.number.generators').circular;

	// цикличный буфер
	var RingBuffer = function(size){
		this.data = {};
		this.indices = new CircularIndexGen(0, 1, size, 0);
	}
	
	RingBuffer.prototype = {
		push: function(v){
			this.data[this.indices.next()] = v;
		}
	}
	
	return RingBuffer;

})