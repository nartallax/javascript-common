pkg("util.utf8", () => {

	return {
		getByteLength: str => {
			var result = 0, len = str.length;
			for(var i = 0; i < len; i++) {
				var charcode = str.charCodeAt(i);
				if (charcode < 0x80) 
					result += 1;
				else if(charcode < 0x800)
					result += 2;
				else if(charcode < 0xd800 || charcode >= 0xe000)
					result += 3;
				else
					result += 4;
			}
			return result;
		},
		
		getBytes: (str, base, start) => {
			var utf8 = base || [], 
				pos = start || 0,
				len = str.length;
			for(var i = 0; i < len; i++) {
				var charcode = str.charCodeAt(i);
				if (charcode < 0x80){
					utf8[pos++] = charcode;
				} else if(charcode < 0x800){ 
					utf8[pos++] = 0xc0 | (charcode >> 6);
					utf8[pos++] = 0x80 | (charcode & 0x3f);
				} else if(charcode < 0xd800 || charcode >= 0xe000) {
					utf8[pos++] = 0xe0 | (charcode >> 12);
					utf8[pos++] = 0x80 | ((charcode>>6) & 0x3f);
					utf8[pos++] = 0x80 | (charcode & 0x3f);
				} else { // surrogate pair
					i++;
					// UTF-16 encodes 0x10000-0x10FFFF by
					// subtracting 0x10000 and splitting the
					// 20 bits of 0x0-0xFFFFF into two halves
					charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
					utf8[pos++] = 0xf0 | (charcode >> 18);
					utf8[pos++] = 0x80 | ((charcode >> 12) & 0x3f);
					utf8[pos++] = 0x80 | ((charcode >> 6) & 0x3f);
					utf8[pos++] = 0x80 | (charcode & 0x3f);
				}
			}
			return { bytes: utf8, length: pos - (start || 0)};
		},
		
		getString: (utf8, start, maxLen) => {
			var limit = typeof(maxLen) === "number"? maxLen + (start || 0): utf8.length, out = "", i = start || 0;
			var c, char2, char3;

			while(i < limit){
				c = utf8[i++];
				switch(c >> 4){ 
					case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
						// 0xxxxxxx
						out += String.fromCharCode(c);
						break;
					case 12: case 13:
						// 110x xxxx   10xx xxxx
						char2 = utf8[i++];
						out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
						break;
					case 14:
						// 1110 xxxx  10xx xxxx  10xx xxxx
						char2 = utf8[i++];
						char3 = utf8[i++];
						out += String.fromCharCode(((c & 0x0F) << 12) |
						   ((char2 & 0x3F) << 6) |
						   ((char3 & 0x3F) << 0));
						break;
				}
			}

			return out;
		}
	}

})