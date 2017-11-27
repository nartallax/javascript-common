pkg('coll.ring.buffer', () => {

	// цикличный буфер
	var RingBuffer = function(size){
		(size > 0) || fail('Expected size of ring buffer to be positive value, got ' + size + ' instead.');
		
		this.data = {};
		this.index = 0;
		this.size = size;
	}
	
	RingBuffer.prototype = {
		push: function(v){
			this.data[this.index] = v;
			this.index = (this.index + 1) % this.size;
		}
	}
	
	return RingBuffer;

})