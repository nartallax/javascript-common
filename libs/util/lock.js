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
		
		wait(cb){
			(this._lsers || (this._lsers = [])).push(cb);
				
			if(!this._locked){
				this.lock();
				setTimeout(() => this.unlock(), 1);
			}
		}
		
		acquire(cb){
			this.wait(() => {
				this.lock();
				return () => this.unlock();
			});
		}
		
		with(callback){
			return new Promise((ok, bad) => {
				this.wait(async () => {
					this.lock();
					try {
						ok(await Promise.resolve(callback()));
					} catch(e) {
						bad(e)
					} finally{
						this.unlock();
					}
				});
			});
		}
	}

	return Lock;
})