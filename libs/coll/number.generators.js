pkg('coll.number.generators', () => {
	// разнообразные генераторы числовых последовательностей
	
	var Stream = pkg('coll.stream');
	
	// некий генератор, который выдает следующее число, глядя только на одно предыдущее
	// т.о. состояние его заключено в одном числе
	var OneBehindLookingGenerator = function(initialValue, currentValue){
		this.initialValue = initialValue;
		this.currentValue = typeof(currentValue) === typeof(initialValue)? currentValue: initialValue;
	}
	
	OneBehindLookingGenerator.prototype = Stream.extend({
		incrementOf: () => fail("Not implemented: OneBehindLookingGenerator.incrementOf"),
		hasNext: () => fail("Not implemented: OneBehindLookingGenerator.hasNext"),
		clone: () => fail("Not implemented: OneBehindLookingGenerator.clone"),
		next: function(x){ 
			if(arguments.length > 0) return this.incrementOf(x);
			
			var result = this.currentValue;
			this.currentValue = this.incrementOf(this.currentValue)
			return result;
		},
		head: function(){ return this.currentValue },
		reset: function(){ this.currentValue = this.initialValue; return this },
		start: function(){ return this.initialValue }
	})
	
	// монотонно возрастающая/убывающая последовательность
	// при превышении определенного порога принимает минимально/максимально возможное значение
	var CircularIncrementalNumberGenerator = function(startValue, step, limit, jumpValue, currentValue){
		OneBehindLookingGenerator.call(this, arguments.length >= 1? startValue: 0, currentValue);
		this.step = arguments.length >= 2? step: 1;
		this.limit = arguments.length >= 3? limit: (this.step > 0? 1: -1) * Math.pow(2, 52);
		this.jumpValue = arguments.length >= 4? jumpValue: -this.limit;
	}
	
	CircularIncrementalNumberGenerator.prototype = OneBehindLookingGenerator.extend({
		incrementOf: function(x){ return (this.step > 0? x + this.step >= this.limit: x + this.step <= this.limit)? this.jumpValue: x + this.step },
		hasNext: function(){ return true },
		clone: function(){ 
			return new CircularIncrementalNumberGenerator(this.initialValue, this.step, this.limit, this.jumpValue, this.currentValue)
		}
	})
	
	// генератор от определенного числа до определенного
	var LimitedNumberGenerator = function(start, step, end, current){
		OneBehindLookingGenerator.call(this, arguments.length >= 1? start: 0, current);
		this.step = arguments.length >= 2? step: 1;
		this.end = arguments.length >= 3? end: (this.step > 0? 1: -1) * Math.pow(2, 52);
	}
	
	LimitedNumberGenerator.prototype = OneBehindLookingGenerator.extend({
		hasNext: function(){ return this.step > 0? this.currentValue < this.end: this.currentValue > this.end },
		incrementOf: function(x){ return this.currentValue + this.step },
		clone: function(){ return new LimitedNumberGenerator(this.initialValue, this.step, this.end, this.currentValue); }
	});
	
	return {
		circular: CircularIncrementalNumberGenerator,
		limited: LimitedNumberGenerator
	}

})