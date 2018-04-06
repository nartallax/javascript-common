pkg("util.limiter.thread", () => {

	class ThreadLimiter {
		constructor(threadCount){
			(threadCount > 0) || fail("Expected threadcount to be at least 1.");
			this.max = this.free = threadCount;
			this.doneWaiters = [];
			this.tasks = [];
		}
		
		// returns when task is submitted, not finished
		run(task){
			return new Promise(async (ok, bad) => await this.runInternal(task, ok, bad));
		}
		
		async runInternal(task, ok, bad){
			try {
				if(this.free > 0){
					this.free--;
					ok(); // task is launched, so we are returning
					await Promise.resolve(task());
					this.free++;
					await this.tryFinish();
				} else {
					this.tasks.push({task: task, ok: ok, bad: bad});
				}
			} catch(e){ bad(e) }
		}
		
		async tryRunQueued(){
			if(this.free > 0 && this.tasks.length > 0){
				let {task, ok, bad} = this.tasks.shift();
				await this.runInternal(task, ok, bad);
			}
		}
		
		async tryFinish(){
			if(this.free === this.max){
				if(this.tasks.length > 0){
					return await this.tryRunQueued();
				}
				let waiters = this.doneWaiters;
				this.doneWaiters = [];
				waiters.forEach(d => d());
			}
		}
		
		wait(){
			return new Promise(ok => {
				if(this.free === this.max){
					ok();
				} else {
					this.doneWaiters.push(ok);
				}
			})
		}
	}
	
	return ThreadLimiter;
})