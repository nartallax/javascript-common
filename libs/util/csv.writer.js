pkg("util.csv.writer", () => {
	
	let fs = pkg.external("fs"),
		stream = pkg.external("stream");
	
	class CSVWriter {
		
		constructor(output, headers, encoding){
			this.headers = Array.isArray(headers)? headers: null;
			this.headersFlushed = false;
			this.output = null;
			this.outputPath = null;
			this.encoding = encoding || "utf8";
			if(output instanceof stream.Writable){
				this.output = output;
			} else if(typeof(output) === "string") {
				this.outputPath = output;
			} else fail("CSVWriter expected string or stream.Writable as output, got neither.");
		}
		
		tryWriteHeaders(output, firstLine){
			if(this.headersFlushed)
				return;
			this.headersFlushed = true;
			if(!this.headers && !Array.isArray(firstLine)) // cannot extract headers from array
				this.headers = Object.keys(firstLine);
			this.putLine(output, this.headers);
		}
		
		lineArrToString(lineArr){
			return "\"" 
				+ lineArr
					.map(x => {
						switch(typeof(x)){
							case "string": return x;
							case "boolean": return x? "true": "false";
							case "undefined": return "";
							case "number": return Number.isNaN(x)? "NaN": x + "";
							case "object": return x === null? "null": Array.isArray(x)? "[Array]": "[Object]";
							default: return "";
						}
					})
					.map(x => x.replace("\"", "\"\"").replace("\n", " ")).join("\",\"") 
				+ "\"\n"
		}
		
		putLine(output, line){
			if(Array.isArray(line)){
				output.write(this.lineArrToString(line), this.encoding)
			} else if(typeof(line) === "object" && line){
				this.tryWriteHeaders(output, line);
				return this.putLine(output, this.headers.map(h => line[h]));
			} else fail("Expected line to write into CSV to be array or non-null object, got neither.");
		}
		
		closeStream(output){
			return new Promise((ok, bad) => {
				output.end(err => err? bad(err): ok());
			});
		}
		
		async withWriter(body){
			let needClose = false;
			let output = this.output;
			
			if(!output){
				needClose = true;
				output = fs.createWriteStream(this.outputPath);
			}
			
			try {
				return await Promise.resolve(body(line => this.putLine(output, line)));
			} finally {
				if(needClose && output)
					await this.closeStream(output);
			}
		}
		
	}
	
	return CSVWriter;
	
});