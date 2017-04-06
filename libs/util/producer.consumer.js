pkg('util.producer.consumer', () => {
	
	var Event = pkg('util.event'),
		Queue = pkg('coll.queue');
	
	// сущность, позволяющая организовать схему взаимодействия "producer-consumer"
	// схема:
	// продьюсер создает этот объект, передает его консумерам
	// консумеры ждут данных в waitForStatus()
	// продьюсер пихает данные в supply()
	// пока данные лежат в этом объекте, консумеры по очереди перестают ждать с hasData = true
	// первый консумер, которому понравились данные, забирает их через consume(). остальные в очереди ждут следующих данных
	// у продьюсера кончаются данные, он дергает за close()
	// этот объект ждет, пока в буфере не кончатся данные, а затем рассылает всем оставшимся консумерам сообщения с hasData = false
	// опционально, продьюсер может контролировать размер буфера с помощью ивента onConsumption() и метода size()
	var PC = function(){
		this.data = new Queue();
		this.consumers = new Queue();
		this.onConsumption = new Event();
		this.onClose = new Event();
		this.isClosed = false;
		this.isClosingRequested = false;
	}
	
	PC.prototype = {
		// интерфейс для консумера
		waitForStatus: function(cb){ 
			this.isClosed? setImmediate(() => cb(false)): this.consumers.push(cb); 
			setImmediate(() => this.tryFindConsumer()); // предполагается, что cb дергается всегда асинхронно
		},
		peekData: function(){ return this.data.peek() },
		consume: function(){ 
			setImmediate(() => this.onConsumption.fire());
			return this.data.pop();
		},
		
		// интерфейс для продусера
		supply: function(v){
			this.isClosingRequested && fail("Data supply()ed by producer after close() is called.");
			this.data.push(v);
			this.tryFindConsumer();
		},
		size: function(){ return this.data.size() },
		close: function(){
			this.isClosingRequested = true;
			this.hasData() || this.closeForce();
		},
		closed: function(){ return this.isClosed },
		closeRequested: function(){ return this.isClosingRequested },
		
		// внутренние методы
		tryFindConsumer: function(){ 
			while(this.hasData() && this.consumers.size() > 0) this.consumers.pop()(true);
			this.hasData() || (this.isClosingRequested && this.closeForce());
		},
		hasData: function(){ return this.data.size() > 0 },
		closeForce: function(){
			this.isClosingRequested || fail("Forced to close without proper request.");
			this.isClosed = true;
			this.onClose.fire();
			this.consumers.each(x => x(false));
		}
	}
	
	return PC;
	
});