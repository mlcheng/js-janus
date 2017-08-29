/***********************************************

  "janus.js"

  Created by Michael Cheng on 08/27/2017 20:57
            http://michaelcheng.us/
            michael@michaelcheng.us
            --All Rights Reserved--

***********************************************/

'use strict';

// jshint ignore:start

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

// After all tests are added to the queue, run the tests.
setTimeout(testRunner);

async function testRunner() {
	/**
	 * Restore observed functions to the original one. This avoids any potential side effects :D
	 * @param  {Set} observedFunctions The set of observed functions to restore.
	 */
	function restoreObservedFunctions(observedFunctions) {
		observedFunctions.forEach(obs => {
			obs.obj[obs.fn] = obs.obj[obs.fn][ORIG_FN];
		});
	}

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
		 * Stores functions declared as async that are to be resolved.
		 */
		const asyncFunctions = [];

		const tools = {
			async(fn) {
				asyncFunctions.push(fn);
			},

			observe(obj, fn, callActual = true) {
				observedFunctions.add({ obj, fn });

				obj[fn][CALL_COUNT] = 0;

				obj[fn][ORIG_FN] = obj[fn].bind(obj);

				obj[fn] = new Proxy(obj[fn], {
					apply(target, thisArg, args) {
						obj[fn][CALL_COUNT]++;
						obj[fn][CALLS] = args;

						// Only call through to the actual function if specified.
						if(callActual) Reflect.apply(target, thisArg, args);
					}
				});
			},

			expect(actual) {
				const comparators = {};

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
						errorFragment: `${Test.prototype.stringify(actual)} to have been called`
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

		// Inject tools and run the specified test.
		test.unit(tools);

		// If there are any async functions to run, run them.
		if(asyncFunctions.length) {
			restoreObservedFunctions(observedFunctions);

			await Promise.all(
				asyncFunctions.map(fn => new Promise(resolve =>
					fn(resolve)
				))
			);
		}

		restoreObservedFunctions(observedFunctions);

		// Log the output to the console.
		Test.prototype.log(test.testDescription, outputMessages);

		// Update the suite's pass/fail stats.
		if(outputMessages.some(message => !message.passed)) {
			testsFailed++;
		} else {
			testsPassed++;
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

	// Wait for all tests to resolve before continuing
	await Promise.all(TESTS_TO_RUN.map(resolveTest));

	// All tests have finished.
	// Log final messages to the user to show suite results.
	const amntTests = TESTS_TO_RUN.length;
	const suitePassed = testsPassed === amntTests;
	const testsStr = amntTests === 1 ? 'test' : 'tests';

	console.log('======================================');

	Test.prototype.colorize(suitePassed);
	if(suitePassed) {
		console.log('CONGRATS!');
	} else {
		console.log(`Failed ${testsFailed} of ${amntTests} ${testsStr}.`);
	}
	console.log(`Passed ${testsPassed} of ${amntTests} ${testsStr}.`);
	console.log(`Finished ${amntTests} ${testsStr}.`);
	Test.prototype.decolorize();
}

function Test(testDescription, unit) {
	TESTS_TO_RUN.push({ testDescription, unit });
}

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

	CALLED(fn) {
		if(!fn.hasOwnProperty(CALL_COUNT)) {
			throw new Error('Function was not observed');
		}

		return fn[CALL_COUNT] >= 0;
	},

	CALLED_WITH(fn, args) {
		if(!fn.hasOwnProperty(CALLS)) {
			throw new Error('Function was not observed');
		}

		return Test.prototype.ValidationFunction.EQUALS(fn[CALLS], args);
	}
};

Test.prototype.stringifyArgs = (args) => args.map(arg => {
	return Test.prototype.stringify(arg);
}).join(', ');

Test.prototype.stringify = (s) => {
	if(typeof s === 'string') {
		return `"${s}"`;
	} else if(typeof s === 'function' && s[CALLS]) {
		return Test.prototype.stringifyArgs(s[CALLS]);
	} else {
		return JSON.stringify(s);
	}
};

Test.prototype.colorize = (success) => {
	let colorOut = '';

	if(success) {
		colorOut += '\x1b[49m\x1b[92m';
	} else {
		colorOut += '\x1b[101m\x1b[93m';
	}

	console.log(colorOut);
};

Test.prototype.decolorize = () => {
	console.log('\x1b[0m'); // Reset.
};

Test.prototype.log = (testDescription, errorMessages) => {
	let output = `${testDescription}\n> `;
	let passed = !(errorMessages.some(errorMessage => !errorMessage.passed));

	if(!errorMessages.length) {
		output += 'ERROR: No tests were run';
		passed = false;
	} else if(passed === true) {
		output += '[✔] Passed!';
	} else {
		output += '[✖] Failed.';
		output += errorMessages.map(errorMessage => {
			// Don't show the error fragment if it passed.
			if(errorMessage.passed) return;

			return `\n      Expected ${errorMessage.errorFragment}`;
		}).join('');
	}

	Test.prototype.colorize(passed);
	console.log(`${output}`);
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

	module.exports = { Test, inject };
}