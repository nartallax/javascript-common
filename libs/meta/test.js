// некоторые функции, относящиеся к тестированию
pkg('meta.test', () => {
	
	var Stack = pkg('meta.stack');
	
	var registeredTests = {};
	
	var Test = (name, action) => {
		var mod = Stack()[2].getSimpleModuleName();
		var modTests = (mod in registeredTests)? registeredTests[mod]: (registeredTests[mod] = {});
		
		(name in modTests) && fail('Test "' + name + '" from ' + mod + ' is already registered.');
		modTests[name] = action;
	}
	
	var TestFailure = function(mod, name, error){
		this.mod = mod;
		this.name = name;
		this.error = error;
	}
	
	TestFailure.prototype.toString = function(){
		return 'Failed: in ' + this.mod + ' "' + this.name + '" with error ' + this.error;
	}
	
	
	Test.run = function(cb, moduleName, testName){
		if(arguments.length > 1){
			if(!(moduleName in registeredTests)) return []; // нет тестов - нет проблем
			var modTests = registeredTests[moduleName];
			var testList;
			
			if(arguments.length > 2){
				(testName in modTests) || fail('Asked to run test "' + testName + '" from module ' + moduleName + ', but there is no test with this name.');
				testList = {};
				testList[testName] = modTests[testName];
			} else testList = modTests;
			
			var failedTests = [];
			
			Object.keys(testList).async().each((name, cb) => {
				var action = testList[name];
				switch(action.length){
					case 0: 
						try {
							action();
						} catch(e){
							failedTests.push(new TestFailure(moduleName, name, e));
						};
						cb();
						break;
					case 1:
						action(isGood => {
							if(isGood === false){
								failedTests.push(new TestFailure(moduleName, name, e));
							} else if(isGood !== true) {
								fail('Expected asynchronous test to return value of type boolean, got value of type ' + typeof(isGood) + ' instead.');
							}
							cb();
						});
						break;
					default: fail('Unexpected number of arguments for test action: ' + action.length);
				}
			}, () => cb(failedTests));
			
			return failedTests;
		} else return Object.keys(registeredTests).async().flatMap((k, cb) => Test.run(cb, k)).array(cb);
	}
	
	// >:3
	Test.passAll = cb => {
		Test.run(testResults => {
			if(testResults.length > 0){
				testResults.each(x => console.error(x.toString()));
				fail("Some tests are failed. Application will not run properly. Stopping.");
			} else cb();
		});
		
	}
	
	Test.expect = (cond, stackOffset) => cond || fail('Expectations failed at ' + Stack()[2 + (stackOffset || 0)].toShortString());
	Test.expectException = action => {
		try {
			action();
			expect(false, 1);
		} catch(e){ return e };
	}
	
	return Test;
	
});