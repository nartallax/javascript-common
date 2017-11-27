pkg('coll.sequental.buffer.rectifier', () => {

	var CircularIndexGen = pkg('coll.number.generators').circular,
		Stream = pkg('coll.stream');

	// коллекция для случаев, когда есть множество итемов, поступающих в почти-отсортированном виде
	// например, множество асинхронно исполняющихся запросов, результаты которых хочется видеть в том же порядке, что и запросы
	// данные должны приходить вместе с индексом, соответствующем тому, что генерит передаваемый генератор, или indices
	var SeqBufRec = function(onSequentalResultItemAvailable, indexGenerator){
		this.data = {};
		this.indices = indexGenerator? indexGenerator.clone(): new CircularIndexGen();
		this.tail = this.indices.head();
		this.itemsStored = 0;
		this.handler = onSequentalResultItemAvailable;
	}
	
	SeqBufRec.prototype = Stream.extend({
		push: function(index, value){
			(index in this.data) && fail("Expected value indices to be unique, got repeated index: " + index);
			this.data[index] = value;
			this.itemsStored++;
			this.checkForAvailableValues();
		},
		
		checkForAvailableValues: function(){
			if(!this.handler) return; // значит, видимо, данные из этого буфера забираются через next()
			while(this.hasNext()){
				var nextIndex = this.tail
				this.handler(this.next(), nextIndex);
			}
		},
		
		hasNext: function(){ return this.tail in this.data },
		head: function(){ return this.data[this.tail] },
		next: function(){ 
			var v = this.data[this.tail];
			delete this.data[this.tail];
			this.itemsStored--;
			this.tail = this.indices.next(this.tail);
			return v;
		},
		
		size: function(){ return this.itemsStored }
	})
	
	return SeqBufRec;

})