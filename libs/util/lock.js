pkg('util.lock', () => {
	
	class Lock {
		constructor(){
			this._locked = false;
		}
		
		_lock(){ this._locked = true }
		_unlock(){
			this._locked = false;
			let lsers = this._lsers || [];
			
			while(lsers.length){
				lsers.shift().call(null);
				if(this._locked) return;
			}
			
			delete this._lsers;
		}
		
		acquired(){ return this._locked }
		
		wait(){
			return new Promise((ok, bad) => {
				(this._lsers || (this._lsers = [])).push(ok);
				
				if(!this._locked){
					this._lock();
					setTimeout(() => this._unlock(), 1);
				}
			});
		}
		
		async acquire(){
			await this.wait();
			this._lock();
			return () => this._unlock();
		}
		
		async with(callback){
			await this.wait();
			this._lock();
			let result = await Promise.resolve(callback);
			this._unlock();
			return result;
		}
	}

	return Lock;
})