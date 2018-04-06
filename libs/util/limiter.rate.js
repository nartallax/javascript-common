pkg("util.limiter.rate", () => {
	
	class RateLimiter {
		constructor(desiredRate){
			this.timeout = 1000 / desiredRate;
			this.lastTickTime = 0;
		}
		
		tick(){
			return new Promise(ok => {
				let now = Date.now();
				let timeSinceLastTick = now - this.lastTickTime;
				if(timeSinceLastTick >= this.timeout){
					this.lastTickTime = now;
					ok();
				} else {
					let timeToWait = this.timeout - timeSinceLastTick;
					this.lastTickTime = now + timeToWait;
					setTimeout(ok, timeToWait);
				}
			});
		}
	}
	
	return RateLimiter;
	
});