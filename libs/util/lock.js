pkg('util.lock', () => {
	
	class Lock {
		constructor(){
			this._locked = false;
		}
		
		lock(){
			this._locked = true 
		}
		unlock(){
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
					this.lock();
					setTimeout(() => this.unlock(), 1);
				}
			});
		}
		
		async acquire(){
			while(this._locked)
				await this.wait();
			this.lock();
			return () => this.unlock();
		}
		
		async with(callback){
			while(this._locked)
				await this.wait();
			this.lock();
			try {
				return await Promise.resolve(callback());
			} finally{
				this.unlock();
			}
		}
	}

	return Lock;
})