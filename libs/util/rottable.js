pkg("util.rottable", () => {

	// лениво вычисляемое значение, которое может протухнуть
	// потокобезопасно
	class Rottable {
		constructor(rottingTime, fetch){
			this.rottingTime = rottingTime;
			this.lastFetchTime = Date.now() - (rottingTime + 1);
			this.fetch = fetch;
			this.stored = null;
			this.valueWaiters = [];
		}
		
		get(){
			return new Promise(async (ok, bad) => {
				try {
					if(Date.now() - this.lastFetchTime > this.rottingTime){
						this.valueWaiters.push({ok: ok, bad: bad});
						if(this.valueWaiters.length === 1){
							await this.forceRunFetch();
						}
					} else {
						ok(this.stored);
					}
				} catch(e){ bad(e) }
			});			
		}
		
		async forceRunFetch(){
			try {
				this.stored = await Promise.resolve(this.fetch.call(null));
				this.lastFetchTime = Date.now();
				let waiters = this.valueWaiters;
				this.valueWaiters = [];
				waiters.forEach(x => x.ok(this.stored));
			} catch(e){ this.valueWaiters[0].bad(e) }
		}
	}
	
	return Rottable;

})