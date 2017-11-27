pkg('util.class', () => {
	
	var mixedProto = (cls, mix) => {
		var res = function(){}
		res.prototype = cls.prototype;
		var result = new res();
		
		mix = mix || {};
		for(var i in mix) result[i] = mix[i];
		
		return result;
	}
	
	return {
		mixedProto: mixedProto,
		modifyPrototype: () => {
			Function.prototype.extend = function(mix){ return mixedProto(this, mix) }
		}
	}
	
});