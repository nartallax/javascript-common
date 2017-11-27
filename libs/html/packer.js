// штука для упаковки addict-приложения в html-страницу
pkg('html.packer', () => {
	
	const Addict = pkg('meta.addict'),
		fs = pkg.external('fs'),
		Writer = pkg('html.writer');
	
	class Packer {
		
		constructor(){
			this.jsTag = 'div';
			this.jsTagStyle = 'display:none';
			this.jsTagNameAttr = 'data-addict-package-name';
			this.title = '';
			this.metaMap = {};
			this.arbitraryScripts = [];
			this.rootPackages = [];
		}
		
		withEntryPoint(moduleName){ return (this.entryPoint = moduleName), this.withRootPackage(moduleName) }
		withTag(tagName){ return (this.jsTag = tagName), this }
		withTagStyle(styleString){ return (this.jsTagStyle = styleString), this }
		withTagNameAttr(attrName){ return (this.jsTagNameAttr = attrName), this }
		withTitle(title){ return (this.title = title), this }
		withFavicon(localFilePath){ return (this.faviconPath = localFilePath), this }
		withScript(code){ return this.arbitraryScripts.push(code), this }
		withMeta(k, v){ return (this.metaMap[k] = v), this }
		withRootPackage(root){ return this.rootPackages.push(root), this }
		
		getFaviconTag(){
			if(!this.faviconPath) return '';
			const b64 = fs.readFileSync(this.faviconPath).toString('base64'),
				ext = this.faviconPath.match(/[^.]+$/)[0];
			return `<link rel="shortcut icon" type="image/${ext}" href="data:image/${ext};base64,${b64}">`
		}
		
		getHtml(){
			var w = new Writer();
			
			this.faviconPath && w.withFaviconPng(fs.readFileSync(this.faviconPath).toString('base64'));
			this.title && w.withTitle(this.title);
			Object.keys(this.metaMap).forEach(k => w.withMeta(k, this.metaMap[k]));
			this.getBundlePackages().forEach(x => {
				var code = this.escapeJs(pkg.sources(x)),
					attrs = { style: this.jsTagStyle };
				attrs[this.jsTagNameAttr] = x;
				w.withHeaderTag(w.tag(this.jsTag, attrs, code));
			});
			this.arbitraryScripts.forEach(s => w.withScript(s));
			w.withStartupScript(`
				new Function(document.querySelector('${this.jsTag}[${this.jsTagNameAttr}="meta.addict"]').textContent).call(null);
				
				window.Addict
					.resolvers(['browser', '${ this.jsTag }', '${ this.jsTagNameAttr }'])
					.main(() => {
						let app = pkg('${ this.entryPoint }');
						typeof(app) === 'function'? 
							app(): 
							console.warn('It is expected for entry point package (${ this.entryPoint }) to return function; got ' + typeof(app) + ' instead.');
					});
			`)
			
			return w.getHtml();
		}
		
		getBundlePackages(){
			typeof(this.entryPoint) === 'string' || fail('Could not fetch bundle packages list: no entry point module defined.');
			
			var pkgs = {'meta.addict': true};
			
			Addict.withFakeEnvironment(new Addict.Environment('browser'), () => {
				Addict.withClearResolutionCache(() => {
					Addict.withNoAsyncBarrier(() => {
						this.rootPackages.forEach(root => {
							pkgs[root] = true;
							Addict.transitiveDependencyListOf(root).forEach(dep => {
								pkgs[dep] = true;
							});
						});
					});
				});
			});
			
			return Object.keys(pkgs);
		}
		
		escapeJs(code){
			return code.replace(/[&\n\r\<>'"]/g,function(r){return"&#"+r.charCodeAt(0)+";"})
		}
	}
	
	return Packer;
	
});