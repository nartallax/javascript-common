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
			await this.wait();
			this.lock();
			return () => this.unlock();
		}
		
		async with(callback){
			await this.wait();
			this.lock();
			try {
				return await callback();
			} finally{
				this.unlock();
			}
		}
	}

	return Lock;
})