pkg("util.tsv", () => {
	
	class TsvWriter {
		constructor(headers, doOutput){
			this.doOutput = doOutput;
			this.headers = headers;
			
			this.writeArray(this.headers);
		}
		
		writeArray(arr){
			this.doOutput(arr.map(x => (x + "").replace(/\t/g, " ")).join("\t"))
		}
		
		write(smth){
			if(Array.isArray(smth))
				return this.writeArray(smth)
			else if(typeof(smth) === "object" && smth !== null){
				let arr = this.headers.map(k => {
					if(!(k in smth))
						return "";
					let v = smth[k];
					if(typeof(v) === "undefined")
						return "";
					return v + "";
				});
				this.writeArray(arr);
			} else {
				log.warn("Don't know how to output value to TSV: " + smth);
			}
		}
	}
	
	return TsvWriter;
	
});