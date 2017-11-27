pkg('util.event', () => {

	var id = -0xffffffff;
	var getId = () => id++;
	
	var Event = function(name){
		// this breaks instanceof
		// allowing fancy thing like smth.onEvent(e => { ... })
		if(this instanceof Event) return Event(name);
		
		var result = function(newListener){
			result.listen(newListener);
			return this; // if used as method, will return base object - that is cool
		}
		
		for(var i in Event.prototype) result[i] = Event.prototype[i];
		result._eventName = name;
		
		result.start();
		
		return result;
	};
	
	Event.prototype = {
		listen: function(l){
			//console.trace('assigned ' + l.toString().substring(0, 100));
			if(!this.active) throw 'Could not listen to inactive event.'
			var id = l.eventListenerId || (l.eventListenerId = getId())
			this.listeners[id] || (this.listeners[id] = l)
			return this;
		},
		unlisten: function(l){
			//console.trace('disassigned ' + l.toString().substring(0, 100));
			if(!this.active) return; // its okay to unsubscribe from dead event
			if(l.eventListenerId) delete this.listeners[l.eventListenerId];
			return this;
		},
		hasListeners: function(){
			for(var i in this.listeners)
				return true;
			return false;
		},
		fire: function(d){
			if(!this.active) throw 'Could not fire inactive event.';
			let errors = [];
			for(var i in this.listeners){
				try {
					this.listeners[i](d);
				} catch(e){
					log.error("Error executing listener of event" + (this._name ? " " + this._name: "") + ": " + e);
					log.error(e.stack);
					errors.push(e);
				}
			}
			return errors;
		},
		stop: function(){
			//console.trace('stopping');
			if(!this.active) throw 'Could not stop inactive event.'
			delete this.listeners;
			this.active = false;
		},
		start: function(){
			//console.trace('starting');
			if(this.active) throw 'Could not start event that is already active.'
			this.listeners = {};
			this.active = true;
		}
	}
	
	return Event;

});