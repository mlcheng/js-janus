/***********************************************

  "janus.js"

  Created by Michael Cheng on 08/27/2017 20:57
            http://michaelcheng.us/
            michael@michaelcheng.us
            --All Rights Reserved--

***********************************************/

'use strict';

// jshint ignore:start

// After all tests are added to the queue, run the tests.
setTimeout(testRunner);

/**
 * Keeps track of all tests that need to be run.
 */
const TESTS_TO_RUN = [];

/**
 * The property of an observed function that returns the amount of calls made to itself.
 */
const CALL_COUNT = Symbol('observed-function-call-count');

/**
 * The property of an observed function that returns the original unproxied function.
 */
const ORIG_FN = Symbol('observed-function-original-function');

/**
 * The property of an observed function that stores information about the amount of calls made to the observed function.
 */
const CALLS = Symbol('observed-function-calls');

/**
 * The maximum amount of time an asynchronous test can run for.
 */
const ASYNC_MAX_RUNTIME = 5000;

/**
 * Logs messages to the console. Uses `process` if running in the Node environment.
 */
const Logger = {
	log(message) {
		// Use console by default.
		let logger = console.log.bind(console);

		// Otherwise, if running in Node, use process.stdout.write.
		if(typeof process !== 'undefined') {
			logger = process.stdout.write.bind(process.stdout);
		}

		logger(message);
	}
};

/**
 * The Janus object. Should contain configs, etc.
 * TODO: Maybe move the Test prototype here? It makes no sense to be in the prototype anyway.
 */
const janus = {
	matchers: {},
	ASYNC_MAX_RUNTIME
};

/**
 * Add a custom matcher to Janus. These matchers persist through the entire test suite.
 * @param  {String} matcher The name of the matcher, to be used after an expectation, e.g. expect().toContain(...).
 * @param  {Function} fn The matcher function. Takes in an expected and actual value.
 */
janus.addMatcher = (matcher, fn) => {
	janus.matchers[matcher] = fn;
};

async function testRunner() {
	async function resolveTest(test) {
		/**
		 * Retains information about observed functions so that they can be restored after the unit test ends.
		 */
		const observedFunctions = new Set();

		/**
		 * Stores output messages to be logged to stdout after the unit test ends.
		 */
		const outputMessages = [];

		/**
		 * Stores the async test if it is defined as asynchronous.
		 */
		let isAsync = undefined;

		const tools = {
			async(fn) {
				isAsync = fn;
			},

			observe(obj, fn, callActual = true) {
				observedFunctions.add({ obj, fn });

				obj[fn][CALL_COUNT] = 0;

				// TODO: does it matter what it's bound to?
				obj[fn][ORIG_FN] = obj[fn].bind(obj);

				obj[fn] = new Proxy(obj[fn], {
					apply(target, thisArg, args) {
						obj[fn][CALL_COUNT]++;
						obj[fn][CALLS] = args;

						// Only call through to the actual function if specified.
						if(callActual) return Reflect.apply(target, thisArg, args);
					}
				});
			},

			expect(actual) {
				const comparators = {};

				Object.keys(janus.matchers).forEach(matcher => {
					comparators[matcher] = (expected) => {
						outputMessages.push({
							passed: janus.matchers[matcher](expected, actual),
							errorFragment: `${Test.prototype.stringify(actual)} ${matcher} ${Test.prototype.stringify(expected)}`
						});
					};
				});

				/**
				 * Expects two values to be exactly the same one.
				 */
				comparators.toBe = (expected) => {
					outputMessages.push({
						passed: Test.prototype.ValidationFunction.EXACT(actual, expected),
						errorFragment: `${Test.prototype.stringify(actual)} to be ${Test.prototype.stringify(expected)}`
					});
				};

				/**
				 * Performs recursive comparisons to see if two values are equal.
				 */
				comparators.toEqual = (expected) => {
					outputMessages.push({
						passed: Test.prototype.ValidationFunction.EQUALS(actual, expected),
						errorFragment: `${Test.prototype.stringify(actual)} to be ${Test.prototype.stringify(expected)}`
					});
				};

				/**
				 * Specifies whether or not an observed function was called.
				 */
				comparators.toHaveBeenCalled = () => {
					outputMessages.push({
						passed: Test.prototype.ValidationFunction.CALLED(actual),
						errorFragment: `function to have been called`
					});
				};

				comparators.toHaveBeenCalledWith = (...expected) => {
					outputMessages.push({
						passed: Test.prototype.ValidationFunction.CALLED_WITH(actual, expected),
						errorFragment: `function to have been called with ${Test.prototype.stringifyArgs(expected)}. Actual call was ${Test.prototype.stringifyArgs(actual[CALLS])}`
					});
				};

				return comparators;
			}
		};

		// Show the test description.
		Test.prototype.logDescription(test.testDescription);

		// Inject tools and run the specified test.
		try {
			test.unit(tools);
		} catch(e) {
			Test.prototype.logError(e);
		}

		// If the test is asynchronous, resolve it.
		if(isAsync) {
			// TODO: consider overriding setTimeout so tests don't really run that long. May want to have a generic observe function somewhere.

			/**
			 * The timer used to reject the asynchronous test if it didn't finish within the amount of time allotted.
			 */
			let timer;

			const timerPromise = new Promise((resolve, reject) => {
				timer = setTimeout(() => {
					reject(`Asynchronous test did not finish within the allotted time of ${janus.ASYNC_MAX_RUNTIME}ms, defined in janus.ASYNC_MAX_RUNTIME. Remember to call the async callback.`);
				}, janus.ASYNC_MAX_RUNTIME);
			});

			const asyncPromise = new Promise(resolve => isAsync(resolve));

			try {
				// Wait for either the timer to resolve or the async test. Max runtime of 5 seconds is allowed per test.
				await Promise.race([asyncPromise, timerPromise]);
				clearTimeout(timer);
			} catch(e) {
				Test.prototype.logError(e);
			}
		}

		// Restore observed functions to the original one. This avoids any potential side effects :D
		observedFunctions.forEach(obs => {
			obs.obj[obs.fn] = obs.obj[obs.fn][ORIG_FN];
		});

		// Log the output to the console.
		Test.prototype.logResult(outputMessages);

		// Update the suite's pass/fail stats.
		if(outputMessages.length) {
			if(outputMessages.some(message => !message.passed)) {
				testsFailed++;
			} else {
				testsPassed++;
			}
		}

		// Indicate that the test has finished.
		return Promise.resolve();
	}

	/**
	 * Specifies the amount of passing tests within the suite.
	 */
	let testsPassed = 0;

	/**
	 * Specifies the amount of failing tests within the suite.
	 */
	let testsFailed = 0;

	// Find the tests to run, using only focused tests if some are specified, or all tests.
	const focusedTests = TESTS_TO_RUN.filter(test => test.focus);
	const testsToRun = [];
	if(focusedTests.length) {
		testsToRun.push(...focusedTests);
	} else {
		testsToRun.push(...TESTS_TO_RUN);
	}

	// Wait for all tests to resolve before continuing.
	// This runs tests suquentially and blocks subsequent tests from running, preventing problems when observing asynchronously.
	// Reference: https://www.reddit.com/r/webdev/comments/6x7i77/recommended_6_reasons_why_javascripts_asyncawait/dmeze0o/
	await testsToRun.reduce((previousPromise, test) =>
		previousPromise.then(() => resolveTest(test)), Promise.resolve());

	// All tests have finished.
	// Log final messages to the user to show suite results.
	const amntTests = testsToRun.length;
	const suitePassed = testsPassed === amntTests;
	const testsStr = amntTests === 1 ? 'test' : 'tests';

	Logger.log('======================================\n\n');

	Test.prototype.colorize(suitePassed);
	if(suitePassed) {
		Logger.log('CONGRATS!\n');
	} else {
		Logger.log(`Failed ${testsFailed} of ${amntTests} ${testsStr}.\n`);
	}
	Logger.log(`Passed ${testsPassed} of ${amntTests} ${testsStr}.\n`);
	Logger.log(`Finished ${amntTests} ${testsStr}.\n\n`);
	Test.prototype.decolorize();
}

function Test(testDescription, unit) {
	TESTS_TO_RUN.push({ testDescription, unit });
}

function fTest(testDescription, unit) {
	TESTS_TO_RUN.push({ testDescription, unit, focus: true });
}

// TODO: why is there a prototype??

Test.prototype.ValidationFunction = {
	/**
	 * Compares two objects to see if they are the exactly the same.
	 */
	EXACT(actual, expected) {
		return actual === expected;
	},

	/**
	 * Deeply compares two objects to see if they are equal.
	 */
	EQUALS(actual, expected) {
		// http://stackoverflow.com/a/16788517/4230736
		if(expected == null || actual == null) return expected === actual;
		if(expected.constructor !== actual.constructor) return false;
		if(expected instanceof Function) return expected === actual;
		if(expected instanceof RegExp) return expected === actual;
		if(expected === actual || expected.valueOf() === actual.valueOf()) return true;
		if(Array.isArray(expected) && expected.length !== actual.length) return false;
		if(expected instanceof Date) return false;
		if(!(expected instanceof Object)) return false;
		if(!(actual instanceof Object)) return false;

		var level = Object.keys(expected);
		return Object.keys(actual).every(k => ~level.indexOf(k)) &&
			level.every(k => Test.prototype.ValidationFunction.EQUALS(expected[k], actual[k]));
	},

	/**
	 * Specifies if an observed function was called.
	 */
	CALLED(fn) {
		if(!fn.hasOwnProperty(CALL_COUNT)) {
			Test.prototype.logError('Function was not observed');
		}

		return fn[CALL_COUNT] > 0;
	},

	/**
	 * Specifies if an observed function was called with the correct arguments.
	 */
	CALLED_WITH(fn, args) {
		if(!fn.hasOwnProperty(CALLS)) {
			Test.prototype.logError('Function was not observed');
		}

		return Test.prototype.ValidationFunction.EQUALS(fn[CALLS], args);
	}
};

/**
 * Display function arguments as a readable string.
 */
Test.prototype.stringifyArgs = args => args
	.map(arg => Test.prototype.stringify(arg))
	.join(', ');

/**
 * Display a variable as a string. Shows strings in quotes and stringifies objects.
 */
Test.prototype.stringify = s => {
	if(typeof s === 'string') {
		return `"${s}"`;
	} else if(typeof s === 'function' && s[CALLS]) {
		return Test.prototype.stringifyArgs(s[CALLS]);
	} else {
		return JSON.stringify(s, (k, v) =>
			typeof v === 'function' ? 'Function() { [native code] }' : v
		);
	}
};

/**
 * Colorize the console output based on whether or not the output is successful.
 * @param  {Boolean} success Whether or not the output is successful. True indicates the console will be green. Red otherwise.
 */
Test.prototype.colorize = success => {
	// http://jafrog.com/2013/11/23/colors-in-terminal.html
	let colorOut = '';

	if(success) {
		colorOut += '\x1b[32;1m';
	} else {
		colorOut += '\x1b[31;1m';
	}

	Logger.log(colorOut);
};

/**
 * Reset the console color.
 */
Test.prototype.decolorize = () => {
	Logger.log('\x1b[0m'); // Reset.
};

/**
 * Log the test description to the console. The output is not colorized.
 */
Test.prototype.logDescription = testDescription => {
	Logger.log(`${testDescription}\n`);
};

/**
 * Log an error to the console. The error is colorized. The error message is stringified so that the error doesn't kill the process as it's being logged.
 */
Test.prototype.logError = error => {
	Test.prototype.colorize(false);
	// If the error is directly logged to stdout without toString(), the return code kills the process I think.
	Logger.log(`${error.toString()}\n`);
	Test.prototype.decolorize();
};

/**
 * Log the test result to the console. The output is colorized.
 */
Test.prototype.logResult = errorMessages => {
	let output = '';
	let passed = !(errorMessages.some(errorMessage => !errorMessage.passed));

	if(!errorMessages.length) {
		output += 'ERROR: No tests were run';
		passed = false;
	} else if(passed === true) {
		output += '[✔] Passed!';
	} else {
		output += '[✖] Failed.'; // 😵
		output += errorMessages.map(errorMessage => {
			// Don't show the error fragment if it passed.
			if(errorMessage.passed) return;

			return `\n      Expected ${errorMessage.errorFragment}`;
		}).join('');
	}

	Logger.log('> ');
	Test.prototype.colorize(passed);
	Logger.log(`${output}\n\n`);
	Test.prototype.decolorize();
};

if(typeof module !== 'undefined') {
	/* global module, require */
	const fs = require('fs');
	const vm = require('vm');

	/**
	 * Read a file and inject it into tests using Node vm
	 * @param  {String} context The path to the file, usually __dirname
	 * @param  {String} relPath Relative path from the test file to the file to include
	 */
	const inject = (context, relPath) => {
		const PATH = `${context}/${relPath}`;
		vm.runInThisContext(fs.readFileSync(PATH, 'utf8'), PATH);
	};

	module.exports = { Test, fTest, inject, janus };
}