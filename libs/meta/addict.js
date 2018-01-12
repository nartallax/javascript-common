/*
система управления зависимостями

интерфейс:
	определить пакет: 				
		Addict.definePackage(имя_пакета, определение_пакета) => Addict
		alias: pkg(name, definition)
		
	получить определенный пакет:		
		Addict.requestPackage(имя_пакета) => результат_исполнения_определения_пакета
		alias: pkg(name)
		
	получить нодопакет:
		Addict.requestExternalPackage(имя_пакета) => пакет
		alias: pkg.external(имя_пакета)
		
	получить исходный код пакета строкой:
		pkg.sources(имя_пакета)
		
	определить точку входа:			
		Addict.defineMain(функция) => Addict
		alias: Addict.main
		
	определить поисковики зависимостей:
		Addict.defineResolver(Resolver) => Addict
		Addict.Resolver.for(тип_среды, аргумент_резолвера, аргумент_резолвера, ...) => Resolver
		шорткаты для двух предыдущих функций: 
			Addict.defineResolver(тип_среды, аргумент_резолвера, аргумент_резолвера, ...) => Addict
			Addict.resolvers([тип_среды, аргументы...], [тип_среды, аргументы...], ...)
		
		примеры аргументов:
		Addict.Resolver.for('node', {путь_к_директории_с_зависимостями -> префикс_зависимостей_в_директории, ...}[, регексп_фильтра_пути_к_файлам]) => Resolver
		Addict.Resolver.for('browser', имя_тегов_содержащих_определения_пакетов, имя_атрибутов_содержащих_имена_пакетов) => Resolver
		
	получить зависимости пакета:		
		Addict.dependencyListOf(имя_пакета, только_внешние) => [имя_пакета, ...]
		Addict.transitiveDependencyListOf(имя_пакета, только_внешние) => [имя_пакета, ...]
		Addict.dependencyTreeOf(имя_пакета) => {имя_пакета: {имя_пакета: {...}, ...}, ...}	
		(только_внешние - флаг; если не true, внешние зависимости не будут переданы, если true - только внешние будут переданы)
		
	получить информацию о среде исполнения:
		Addict.getEnvironment() => Environment
		
	подменить среду исполнения (только на время синхронного исполнения action):
		Addict.withFakeEnvironment(Environment, action) => Addict
		new Addict.Environment(type)
	
	подменить кеш резолюций пустым (только на время синхронного исполнения action):
		Addict.withClearResolutionCache(action) => Addict
		
	очистить все внутренние кеши (после чего большая часть функций перестанет работать):
		Addict.cleanup() => Addict

как использовать:
	под нодой:
		напилить модулей (файликов с содержимым вида pkg("yet.another.util", () => { return "this is util!" }))
		положить эти файлики в определенную папку. путь к файлику должен выглядеть как ./yet/another.util.js, 
			или ./yet/another/util.js, или ./yet.another.util.js
			(разделители - слеши и/или точки; заменяемы в любом месте файла, кр.расширения; это позволяет гибко организовывать папки)
		определить поисковик зависимостей для ноды: указать, где же лежит зависимость (Addict.defineResolver("node", {"./yet": "yet"}))
			можно указать другие префиксы; если бы наш файлик лежал бы по пути /libs/util.js, то указывать бы следовало {"./libs": "yet.another"}
		определить main (см. функцию выше)
		внутри main (как и внутри других пакетов) неасинхронно запрашивать другие пакеты через pkg("yet.another.util")
		
	под браузером:
		собрать страничку, которая будет содержать все необходимые пакеты, а также main
			код каждого пакета должен лежать в своем теге, с атрибутом, содержащим имя пакета, и не пытаться выполниться самостоятельно
			main, наоборот, должен выполняться самостоятельно (быть включенным в script, например)
			не следует забывать, что для выполнения main нужно выполнить сначала код самого Addict
			список необходимых пакетов можно получить с помощью transitiveDependencyListOf, withFakeEnvironment (если страница собирается под нодой)
				и withClearResolutionCache
			т.о. сначала подменяем среду (чтобы пакеты, выбирающие набор зависимостей исходя из среды, выбрали набор зависимостей для browser), 
				затем очищаем кеш резолюций, чтобы пакеты подгрузились заново
				а затем - получаем список зависимостей для среды browser
		до запуска main-а определить резолвер для браузера: Addict.defineResolver("browser", "my_package_content_tag", "my_package_name_attribute")
		определить main
		
		
*/
var Addict = (() => {
	'use strict';
	
	var fail = (message, error) => {
		var errString = '';
		
		if(error){
			console.log(error);
			errString += "\nInner error: " + error;
			error.isAddictError || (errString += '\n' + error.stack);
		}
	
		var newErr = new Error("Addict error.\n" + message + errString);
		newErr.isAddictError = true;
		throw newErr;
	}
	
	var Addict = function(){
		this.currentEnvironment = this.realEnvironment = Addict.Environment.detect();
		this.definitionStorage = new Addict.DefinitionStorage();
		this.productStorage = new Addict.ProductStorage();
		this.executor = new Addict.Executor(this);
		this.codeFixers = [];
		this.isStartedUp = false;
		this.resolver = null;
		setTimeout(() => this.startTimeoutHandle || this.isStartedUp || fail('Expected application entry point to be defined synchronously at startup.'), 0);
		
		this.registerCodeFixer(new Addict.CodeFixer('auto_use_strict', code => '"use strict";' + code));
		this.registerCodeFixer(new Addict.CodeFixer('add_source_url', (code, pkgName) => {
			var ps = "\n/*@cc_off\n@*/\n/*\n//@ sourceURL=" + pkgName + "\n*/\n//# sourceURL=" + pkgName
			return code + ps;
		}));
	};
	
	// Environment содержит информацию о среде, в которой в данный момент исполняется код
	Addict.Environment = (() => {
		
		var Environment = function(type, global){ this.type = type; this.globals = global || null; }
		
		var detectors = {
			'browser': new Function("return this && typeof(window) !== 'undefined' && this === window"),
			'node': new Function("return this && typeof(global) !== 'undefined' && this === global"),
		};
		
		var globals = {
			'node': () => global,
			'browser': () => window
		}
		
		Environment.detect = () => {
			var envs = Object.keys(detectors).filter(key => detectors[key].call(null));
			(envs.length > 1) && fail("Could not detect environment: multiple detectors triggered (" + envs.join(', ') + ")");
			(envs.length < 1) && fail("Could not detect environment: no detectors triggered");
			return new Environment(envs[0]);
		}
		
		Environment.prototype.getGlobal = function(){ return this.globals || globals[this.type]() }
		
		return Environment;

	})();
	
	// PackageName - идентификатор пакета. считается глобально-уникальным
	Addict.PackageName = (() => {
		
		var pathToName = x => x.toLowerCase()
			.replace(/\.js$/, '')
			.replace(/[\\\/\.]+/g, '.')
			.replace(/(^[\s\.]+|[\s\.]+$)/g, '')
		
		return {
			isGood: x => typeof(x) === 'string' && x.match(/^[a-z]+(?:\.[a-z]+)*/) !== null,
			//normalize: normalize
			fromPath: pathToName
		}
	})();
	
	// Resolver содержит функции, умеющие получать код пакета по его имени, а также внешние пакеты
	Addict.Resolver = (() => {
		
		var Resolver = function(envType, codeByName, externalPackageByName){ 
			this.envType = envType;
			codeByName && (this.codeByName = codeByName);
			externalPackageByName && (this.externalPackageByName = externalPackageByName);
		}
		
		Resolver.prototype = {
			codeByName: function(name){
				fail('Could not resolve package "' + name + '": there is no resolving function defined for environment "' + this.envType + '".')
			},
			
			externalPackageByName: function(name){
				fail('Could not resolve external package "' + name + '": there is no resolving function defined for environment "' + this.envType + '".')
			}
		}
		
		var internalResolvers = {
			'node': (rootPrefixMap, filePathRegexp) => {
				filePathRegexp || (filePathRegexp = /\.[Jj][Ss]$/);
				
				var fs, path;
				var packageMap;
				
				var getPackageMapForDirectory = (root, prefix, container) => {
					fs.readdirSync(root)
						.forEach(entryName => {
							var entryPath = path.join(root, entryName)
							var fullEntryName = (prefix? prefix + '.': '') + entryName.toLowerCase().replace(/\.js$/, '')
							if(fs.statSync(entryPath).isDirectory()){
								getPackageMapForDirectory(entryPath, fullEntryName, container);
							} else {
								if(entryPath.match(filePathRegexp)){
									if(!Addict.PackageName.isGood(fullEntryName)){
										console.error("Package at " + entryPath + ' resolved to name "' + fullEntryName + 
											'", which is not valid package name. This package is skipped and will not be accessible.'
										);
									} else {
										container[fullEntryName] = entryPath;
									}
								}
							}
						});
				}
				
				var getTotalPackageMap = rootPrefixMap => {
					fs || (fs = require('fs'));
					path || (path = require('path'));
					var startedFile = process.argv[1];
					
					var fixedPrefixMap = rootPrefixMap;
					if(startedFile){
						fixedPrefixMap = {};
						startedFile = path.dirname(startedFile);
						Object.keys(rootPrefixMap).forEach(k => {
							fixedPrefixMap[path.resolve(startedFile, k)] = rootPrefixMap[k];
						});
					}
					
					var result = {};
					Object.keys(fixedPrefixMap).forEach(root => {
						getPackageMapForDirectory(root, fixedPrefixMap[root], result)
					})
					return result;
				}
				
				return name => {
					packageMap || (packageMap = getTotalPackageMap(rootPrefixMap));
					(name in packageMap) || fail('Could not resolve package "' + name + '": not found anywhere.');
					return fs.readFileSync(packageMap[name], 'utf8');
				}
			},
			'browser': (a, b) => name => {
				if(typeof(a) === "function" && typeof(b) === "undefined")
					return a(name);
				
				var tag, selector = tagName + '[' + attrName + '="' + name + '"]'
				try {
					tag = document.querySelector(selector)
				} catch(e) {
					fail('Could not resolve package "' + name + '": failed to query selector ' + selector + '.', e);
				}
				
				tag || fail('Could not resolve package "' + name + '": no such tag found.');
				return tag.textContent;
			}
		}
		
		var externalResolvers = {
			'node': () => name => require.main.require(name)
		}
		
		Resolver.for = function(type, varargs){
			var args = [];
			for(var i = 1; i < arguments.length; i++) args[i - 1] = arguments[i];
			
			var internalResolver = (type in internalResolvers) && (internalResolvers[type].apply(null, args));
			var externalResolver = (type in externalResolvers) && (externalResolvers[type].apply(null, args));
			
			internalResolver || externalResolver || fail('Failed to create resolver: no resolvers could be created for type "' + type + '".');
			
			return new Resolver(type, internalResolver, externalResolver);
		}
		
		return Resolver;
		
	})();
	
	// некое хранилище определений, еще не исполненных
	Addict.DefinitionStorage = (() => {
		
		var DefinitionStorage = function(){
			this.defs = {};
			this.expecting = null;
		}
		
		DefinitionStorage.prototype = {
			forceStore: function(name, def){
				this.defs[name] = def;
			},
			
			store: function(name, def){
				(this.expecting !== null)
					|| fail('Unexpected definition of package "' + name + '". Packages must not define themselves at will.');
					
				(name === this.expecting) 
					|| fail('Was expecting the definition of package "' + this.expecting + '" while got definition of "' + name + '".');
					
				this.has(name)
					&& fail('Duplicate definition of package "' + name + '".');
					
				this.expecting = null;
				this.forceStore(name, def);
			},
			
			has: function(name){ return name in this.defs },
			
			get: function(name){
				this.has(name) || fail('Could not fetch definition of package "' + this.defs + '": no definition found.');
					
				return this.defs[name];
			},
			
			withExpectation: function(name, body){
				(this.expecting === null)
					|| fail('Was expecting "' + this.expecting + '" while requested to expect "' + name + '"; seems like internal bug.');
					
				this.expecting = name;
				body();
				(this.expecting === null)
					|| fail('Was expecting definition of package "' + this.expecting + '", but got no definition at all.');
			}
		}
		
		return DefinitionStorage;
		
	})();
	
	// хранилище продукта - результата исполнения определения + информации об его зависимостях
	Addict.ProductStorage = (() => {
		
		var ProductStorage = function(){
			this.prods = {};
		}
		
		ProductStorage.prototype = {
			has: function(name){
				return name in this.prods
			},
			
			checkedGet: function(name){
				this.has(name) || fail('Requested product of package "' + name + '", but the definition is not executed yet (if present).');
				return this.prods[name];
			},
			
			productOf: function(name){ return this.checkedGet(name).product },
			internalDependenciesOf: function(name){ return this.checkedGet(name).internalDependencies },
			externalDependenciesOf: function(name){ return this.checkedGet(name).externalDependencies },
			
			store: function(name, product, internalDependencies, externalDependencies){
				this.has(name) && fail('Could not store product of package "' + name + '": another product is already stored for this package.');
				this.prods[name] = {product: product, internalDependencies: internalDependencies, externalDependencies: externalDependencies};
			}
		}
		
		return ProductStorage;
		
	})();
	
	// исполнитель - которая обрабатывает запросы на получение зависимостей
	// попутно собирает информацию о зависимостях пакетов
	// не хранит постоянно никаких данных (только синхронно собирает информацию о зависимостях)
	Addict.Executor = (() => {
		
		// на самом деле, ему вряд ли понадобится что-то кроме инстанса ProductStorage, DefinitionStorage и Resolver
		// однако они могут быть подменены в рантайме, поэтому не следует хранить ссылки на один инстанс постоянно
		var Executor = function(addict){
			this.addict = addict;
			this.executingMain = false;
			this.executionStack = [];
			this.topMostErrorIsAlreadyReported = true;
		}
		
		Executor.prototype = {
			checkForCircularDependenciesFrom: function(name){
				for(var i = this.executionStack.length - 1; i >= 0; i--){
					if(this.executionStack[i].name === name){
						var dependencyCircle = [];
						for(var j = i; j < this.executionStack.length; j++){
							dependencyCircle.push(this.executionStack[j].name);
						}
						
						dependencyCircle.push(name);
						
						fail('Circular dependencies are not allowed, but present:\n' + dependencyCircle.map(x => '\t' + x).join('\n'));
					}
				}
			},
			
			forceExecuteDefinition: function(name, definition){
				this.checkForCircularDependenciesFrom(name);
				this.topMostErrorIsAlreadyReported = false;
				
				this.executionStack.push({name: name, internal:[], external: []});
				
				var product = undefined;
				try {
					product = definition();
				// зачем здесь (и в forceResolveAndEvalDefinition) такая странная конструкция?
				// это способ хоть как-то выводить синтаксические ошибки.
				// если мы перехватываем эксепшн, а затем кидаем его еще раз, теряется информация о его изначальной локации
				// извлечь эту информацию из пойманного эксепшна не удалось
				// поэтому мы просто позволяем эксепшну долететь до самого верха и распечатать строчку, в которой показывается, где же ошибка
				// а перед этим печатаем имя пакета, т.о. сообщая полную информацию о том, где случился эксепшн
				} finally {
					if(product === undefined && !this.topMostErrorIsAlreadyReported){
						this.topMostErrorIsAlreadyReported = true;
						console.error('Exception occured during running definition of package ' + name);
					}
				}
				
				(typeof(product) === 'undefined') && 
					fail('Unexpected execution result of definition of package "' + name + '": result should not be undefined.');
				
				var deps = this.executionStack.pop();
				this.addict.productStorage.store(name, product, deps.internal, deps.external);
			},
			
			forceResolveAndEvalDefinition: function(name){
				this.topMostErrorIsAlreadyReported = false;
				var code = this.addict.resolver.codeByName(name);
				
				code = this.addict.fixCode(code, name);
				
				this.addict.definitionStorage.withExpectation(name, () => {
					var executedSuccessfully = false;
					try {
						//new Function(code).call(null)
						// используем eval(), а не new Function(), т.к. new Function() добавляет +1 к номеру строки
						// это сбивает с толку
						eval.call(null, code); 
						executedSuccessfully = true;
					} finally {
						if(!executedSuccessfully && !this.topMostErrorIsAlreadyReported){
							this.topMostErrorIsAlreadyReported = true;
							console.error('Exception occured during evaluation of code of package ' + name);
						}
					}
				});
			},
			
			recordDependency: function(name, isExternal){
				if(this.executionStack.length === 0){
					this.executingMain || fail('Illegal request of product of package "' + name + '": main code is not executing.');
				} else {
					var deps = this.executionStack[this.executionStack.length - 1];
					deps[isExternal? 'external': 'internal'].push(name);
				}
			},
			
			ensureHasProduct: function(name){
				if(this.addict.productStorage.has(name)) return;
				
				if(this.addict.definitionStorage.has(name)){
					this.forceExecuteDefinition(name, this.addict.definitionStorage.get(name));
					return;
				}
				
				this.forceResolveAndEvalDefinition(name);
				this.forceExecuteDefinition(name, this.addict.definitionStorage.get(name));
			},
			
			getProduct: function(name){
				this.recordDependency(name, false);
				this.ensureHasProduct(name);
				return this.addict.productStorage.productOf(name);
			},
			
			getExternalProduct: function(name){
				this.recordDependency(name, true);
				return this.addict.resolver.externalPackageByName(name)
			},
			
			startMain: function(runMain){
				this.executingMain = true;
				runMain();
				this.executingMain = false;
			},
			
			getDependenciesOf: function(name, isExternal){
				this.ensureHasProduct(name);
				return this.addict.productStorage[(isExternal? 'external': 'internal') + 'DependenciesOf'].call(this.addict.productStorage, name)
			}
		}
		
		return Executor;
		
	})();
	
	// некоторый алгоритм, призванный изменить исходный код
	Addict.CodeFixer = (() => {
		
		var CodeFixer = function(name, fix){
			this.name = name;
			this.fixAlgo = fix;
		}
		
		CodeFixer.prototype = {
			apply: function(code, moduleName){
				try {
					return this.fixAlgo(code, moduleName);
				} catch (e){
					fail('Failed to apply fixer "' + this.name + '" to code of module "' + moduleName + '".', e);
				}
			}
		}
		
		return CodeFixer;
		
	})();
	
	Addict.prototype = {
		registerCodeFixer: function(fixer){
			this.codeFixers.push(fixer);
			return this;
		},
		
		fixCode: function(code, moduleName){
			this.codeFixers.forEach(fixer => code = fixer.apply(code, moduleName));
			return code;
		},
		
		resolvers: function(vararg){
			for(var i = 0; i < arguments.length; i++){
				this.defineResolver.apply(this, arguments[i]);
			}
			
			return this;
		},
		defineResolver: function(resolver){
			if(typeof(resolver) === 'string'){
				return this.defineResolver(Addict.Resolver.for.apply(null, arguments));
			} else {
				// резолверы для других сред нам никогда не пригодятся
				// даже в случае подмены среды, резолвер останется прежним
				// (т.к. нет никакого смысла искать пакеты в DOM-дереве, если мы запущены в ноде)
				if(this.realEnvironment.type !== resolver.envType) return this;
				
				this.resolver && fail('Could not define resolver twice for environment "' + resolver.envType + '".');
				this.resolver = resolver;
				return this;
			}
		},
		
		definePackage: function(packageName, packageDefinition){
			Addict.PackageName.isGood(packageName) || fail('Failed to define package "' + packageName + '": incorrect name.');
			this.definitionStorage.store(packageName, packageDefinition)
			return this;
		},
		
		checkCanRequestPackagesNow: function(){
			this.startTimeoutHandle 
				&& fail('Failed to request package "' + packageName + '": expected first request to occur after entry point execution start.');
				
			this.isStartedUp 
				&& fail('All dependencies must be requested synchronously at startup time.');
		},
		
		requestPackage: function(packageName){
			Addict.PackageName.isGood(packageName) 
				|| fail('Failed to request package "' + packageName + '": incorrect name.');
				
			this.checkCanRequestPackagesNow();
			return this.executor.getProduct(packageName)
		},
		
		requestExternalPackage: function(packageName){
			this.checkCanRequestPackagesNow();
			return this.executor.getExternalProduct(packageName)
		},
		
		main: function(){ return this.defineMain.apply(this, arguments) },
		defineMain: function(body){
			(this.resolver === null) 
				&& fail('No resolver is defined for current environment (' + this.realEnvironment.type + '). Could not proceed with startup.');
				
			this.isStartedUp 
				&& fail('Main method must be defined synchronously at startup.');
			
			if(this.startTimeoutHandle){
				clearTimeout(this.startTimeoutHandle);
				fail('Application unable to start: more than one entry point detected.');
			}
			
			this.startTimeoutHandle = setTimeout(() => {
				this.startTimeoutHandle = null;
				this.executor.startMain(body)
				this.isStartedUp = true;
			}, 1);
			return this;
		},
		
		dependencyListOf: function(name, external){ return this.executor.getDependenciesOf(name, external === true) },
		transitiveDependencyListOf: function(name, external){ 
			external = external === true;
			var total = {}, stack = [name];
			while(stack.length > 0){
				this.executor.getDependenciesOf(stack.pop(), external)
					.filter(x => !(x in total))
					.forEach(x => {
						total[x] = true;
						stack.push(x)
					});
			}
		
			return Object.keys(total);
		},
		dependencyTreeOf: function(name){
			var result = {};
			this.executor.getDependenciesOf(name, false).forEach(name => result[name] = this.dependencyTreeOf(name))
			return result;
		},
		
		getEnvironment: function(){ return this.currentEnvironment; },
		
		withFakeEnvironment: function(fakeEnv, action){
			var prev = this.currentEnvironment;
			if(typeof(fakeEnv) === "string")
				fakeEnv = new Addict.Environment(fakeEnv)
			this.currentEnvironment = fakeEnv;
			try {
				action();
			} finally {
				this.currentEnvironment = prev;
			}
			return this;
		},
		
		withClearResolutionCache: function(action){
			var old = this.productStorage;
			this.productStorage = new Addict.ProductStorage();
			try {
				action();
			} finally {
				this.productStorage = old;
			}
			return this;
		},
		
		withNoAsyncBarrier: function(action){
			var old = this.isStartedUp;
			try {
				this.isStartedUp = false;
				action();
			} finally {
				this.isStartedUp = old;
			}
			return this;
		},
		
		codeByName: function(name){
			return this.resolver.codeByName(name);
		},
		
		cleanup: function(action){
			this.definitionStorage = null;
			this.productStorage = null;
			this.executor = null;
			this.resolver = null;
			this.codeFixers = null;
			this.currentEnvironment = this.realEnvironment = null;
		},
		
		pkg: function(name, defOrEmpty){
			return defOrEmpty? this.definePackage(name, defOrEmpty): this.requestPackage(name);
		}
	};
	
	(() => {
		var defaultInstance = new Addict();
		Object.keys(Addict.prototype)
			.filter(key => typeof(Addict.prototype[key]) === 'function')
			.forEach(key => {
				Addict[key] = function(){ return defaultInstance[key].apply(defaultInstance, arguments) }
			})
			
		defaultInstance.definitionStorage.forceStore('meta.addict', () => Addict);
	})();
	
	return Addict;
	
})();

(() => {
	var pkg = (name, defOrEmpty) => Addict.pkg(name, defOrEmpty);;
	pkg.external = name => Addict.requestExternalPackage(name);
	pkg.sources = name => Addict.codeByName(name);
	
	switch(Addict.getEnvironment().type){
		case 'node': 
			module.exports = Addict;
			global.pkg = pkg;
			break;
		case 'browser':
			// это избыточно, по идее, но не повредит
			window.Addict = Addict;
			window.pkg = pkg;
			break;
	}
})();

/*@cc_off
 @*/
/*
//@ sourceURL=meta.addict
*/
//# sourceURL=meta.addict