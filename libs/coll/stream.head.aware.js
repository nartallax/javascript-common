pkg('coll.stream.head.aware', () => {
	
	var Stream = pkg('coll.stream');
	
	// стрим, у которого есть буфер на 1 объект
	// это очень помогает при некоторых операциях с коллекциями
	// обычно этот стрим создается неявно
	// head() следует дергать по тем же правилам, что и next(), т.е. только после hasNext()
	var HeadAwareStream = function(hasNext, next){
		this._hn = hasNext;
		this._n = next();
		this._head = null;
		this._hasHead = false;
	}
	
	HeadAwareStream.prototype = Stream.extend({
		loadHead: function(){
			if(!this._hasHead){
				if(this._hn()){
					this._hasHead = true;
					this._head = this._n();
					return true;
				} else return false;
			} else return true;
		},
		
		hasNext: function(){ return this.loadHead() },
		next: function(){
			var result = this._head;
			this._hasHead = false;
			this._head = null; // не следует держать лишние ссылки на данные, которые нам не нужны
			return result;
		},
		
		head: function(){ return this._head },
		takeWhile: function(cond, index){
			index = index || 0;
			return new Stream(() => this.loadHead() && cond(this._head, index), () => (index++, this.next()));
		},
		
		filter: function(cond, index){
			return new Stream(
				() => {
					while(this.loadHead() && !cond(this._head, index)) (index++, this.next());
					return this._hasHead;
				}, 
				() => (index++, this.next())
			)
		},
		
		dropWhile: function(cond, index){
			index = index || 0;
			var findFirstSuitable = false;
			return new Stream(
				() => {
					while(!findFirstSuitable && this.loadHead() && cond(this._head, index)) (index++, this.next());
					return this.loadHead();
				},
				() => this.next();
			);
		}
		
	});
	
	return HeadAwareStream;
	
})