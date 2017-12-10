// TODO: make this more effective for big sizes of cache
pkg("util.cache.lru", () => {

	class LRUCache {
	
		constructor(cacheSize, getData, translateKey){
			if(cacheSize < 1) 
				fail("Cache size expected to be >= 1.");
			this._storage = {};
			this._size = cacheSize;
			this._getData = getData;
			this._translateKey = translateKey || (x => x);
		}
		
		_put(key, value){
			if(key in this._storage){
				let oldIndex = this._storage[key].index;
				for(let k in this._storage)
					if(this._storage[k].index < oldIndex)
						this._storage[k].index++;
				this._storage[key].index = 0;
				//console.error("UPDATED ", key, JSON.stringify(this._storage));
			} else {
				this._storage[key] = {index: 0, value: value};
				let maxIndexKey = key;
				for(let k in this._storage){
					this._storage[k].index++;
					if(this._storage[k].index > this._storage[maxIndexKey].index)
						maxIndexKey = k;
				}
				this._storage[key].index = 0;
				//console.error("ADDED NEW ", key, JSON.stringify(this._storage));
				if(Object.keys(this._storage).length > this._size){
					//console.error("DELETING ", maxIndexKey, JSON.stringify(this._storage));
					delete this._storage[maxIndexKey];
				}
				
			}
			
		}
		
		async get(key){
			let tkey = this._translateKey(key);
			let value = tkey in this._storage? this._storage[tkey].value: await Promise.resolve(this._getData(key));
			this._put(tkey, value);
			return value;
		}
		
		
	}
	
	return LRUCache;

});