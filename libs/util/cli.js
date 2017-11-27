pkg('util.cli', () => {
	
	var fieldNameValidationRegexp = /^[a-z]+(?:\d|[A-Z](?:[a-z\d]+|$))*$/;
	var isGoodFieldName = name => name.match(fieldNameValidationRegexp)? true: false;
	
	var fieldNameToKey = name => {
		if(name.length === 1){
			return '-' + name;
		} else {
			return '--' + name.replace(/[A-Z]/g, b => '-' + b.toLowerCase());
		}
	}
	
	var aliasFrom = alias => {
		(typeof(alias) === 'undefined') && (alias = []);
		(typeof(alias) === 'string') && (alias = [alias]);
		return alias;
	}
	
	/*
	desc: 
	{
		myKey: { default: 'NOPE', type: 'string', alias: ['mk', 'key'], multipleValues: true, isHelp: false},
		help: {alias: 'h', isHelp: true}
		...
	}
	*/
	var CLI = function(desc){
		Object.keys(desc).forEach(k => {
			if(!isGoodFieldName(k)) throw new Error("Incorrect field name: '" + k + "'. Expected it to match " + fieldNameValidationRegexp);
			
			aliasFrom(desc[k].alias).forEach(k => {
				if(!isGoodFieldName(k)) throw new Error("Incorrect field name: '" + k + "'. Expected it to match " + fieldNameValidationRegexp);
			})
		});
		
		this.fieldNames = Object.keys(desc);
		this.keyFieldMap = {};
		Object.keys(desc).forEach(fieldName => {
			var key = fieldNameToKey(fieldName);
			if(key in this.keyFieldMap) throw new Error('Duplicate field key: ' + key);
			this.keyFieldMap[key] = fieldName;
			
			var alias = aliasFrom(desc[fieldName].alias);
			alias.forEach(k => {
				var key = fieldNameToKey(k);
				if(key in this.keyFieldMap) throw new Error('Duplicate field key: ' + key);
				this.keyFieldMap[key] = fieldName;
			});
		});
		
		this.types = {};
		Object.keys(desc).forEach(k => {
			this.types[k] = desc[k].type || 'string';
			if(this.types[k] !== 'string' && this.types[k] !== 'number' && this.types[k] !== 'boolean'){
				throw new Exception('Unknown type specified: "' + this.types[k] + '": only string, number or boolean allowed.');
			}
		});
		
		this.defaults = {};
		Object.keys(desc).forEach(k => {
			if('default' in desc[k]){
				this.defaults[k] = desc[k].default;
				if(this.types[k] === 'boolean') throw new Error('Default value for booleans are always false and cannot be overriden. Field name: "' + k + '".');
			}
		});
		
		this.descriptions = [];
		Object.keys(desc).forEach(k => {
			var keys = aliasFrom(desc[k].alias).map(fieldNameToKey);
			keys.push(fieldNameToKey(k));
			this.descriptions.push(keys.join(', ') 
				+ '; type = ' + desc[k].type 
				+ (this.defaults[k]? '; default = ' + this.defaults[k]: '')
				+ (desc[k].description? '\n' + desc[k].description: ''))
		});
		
		this.multiples = {};
		Object.keys(desc).forEach(k => {
			this.multiples[k] = desc[k].multipleValues? true: false;
			if(this.multiples[k] && this.types[k] === 'boolean') throw new Error('Multiple values for booleans are not allowed! Field name: "' + k + '".');
		});
		
		this.helpField = null;
		Object.keys(desc).forEach(k => {
			if(desc[k].isHelp){
				if(this.helpField) throw new Error('Only one help field is allowed.');
				if(this.types[k] !== 'boolean') throw new Error('Help field must have boolean type, got ' + this.types[k] + ' instead.');
				this.helpField = k;
			}
		});
	}
	
	CLI.prototype = {
		printHelp: function(){ console.error(this.descriptions.join('\n\n')) },
		
		parse: function(argv){
			var result = {};
			
			for(var i = 2; i < argv.length; i++){
				var nextPart = argv[i];
				if(!(nextPart in this.keyFieldMap)) throw new Error('Unknown key: "' + nextPart + '".');
				var fieldName = this.keyFieldMap[nextPart];
				if((fieldName in result) && !this.multiples[fieldName]) throw new Error('Duplicate value passed with the key "' + nextPart + '".')
				if(this.types[fieldName] !== 'boolean' && i === argv.length - 1) throw new Error('Expected some value after the key "' + nextPart + '".');
				
				var realValue;
				switch(this.types[fieldName]){
					case 'string': realValue = argv[++i]; break;
					case 'number':
						var num = parseFloat(argv[++i]);
						if(Number.isNaN(num)) throw new Error('Expected number after key "' + nextPart + '", got "' + argv[i] + '" instead.');
						realValue = num;
						break;
					case 'boolean': realValue = true; break;
				}
				
				if(this.multiples[fieldName]){
					result[fieldName] || (result[fieldName] = []);
					result[fieldName].push(realValue);
				} else {
					result[fieldName] = realValue;
				}
			}
			
			var haveHelp = this.helpField && result[this.helpField];
			
			if(!haveHelp){
				this.fieldNames.forEach(fieldName => {
					if(!(fieldName in result)){
						if(this.types[fieldName] === 'boolean'){
							result[fieldName] = false;
						} else if(fieldName in this.defaults) {
							result[fieldName] = this.defaults[fieldName];
						} else {
							throw new Error('Mandatory field is not supplied: "' + fieldNameToKey(fieldName) + '".');
						}
					}
				});
			}
			
			return result;
		}
	}
	
	return CLI;
	
});