/***********************************************

  "janus.js"

  Created by Michael Cheng on 5/25/2020 8:30:53 AM
            http://michaelcheng.us/
            michael@michaelcheng.us
            --All Rights Reserved--

***********************************************/

'use strict';

import { OBSERVER_STORE, Validator } from './validator';

function colorize(s) {
	return `\x1b[${s}m`;
}

const Colors = {
	DIM: colorize(34),
	CYAN: colorize(46),
	GREEN: colorize(42),
	GREEN_FG: colorize(32),
	RED: colorize(41),
	RESET: colorize(0),
};

function log(message, color = Colors.RESET) {
	console.log(`${color}${message}${Colors.RESET}`);
}

function logError(message) {
	log(message, Colors.RED);
}

class Spec {
	constructor(descriptor, body) {
		this.descriptor = descriptor;
		this.body = body;
		this.actualResult;
		this.expectedResult;
		this.failed = false;
		this.observedFunctions = new Set();
	}
}

const TEST_QUEUE = [];

export function test(descriptor, fn) {
	TEST_QUEUE.push(new Spec(descriptor, fn));
}

function stringify(result) {
	if(typeof result === 'object') {
		return JSON.stringify(result, null, 2);
	}

	return result;
}

function validate(spec, expected, validator) {
	spec.expectedResult = expected;

	if(!validator(spec)) {
		let displayActual = spec.actualResult;
		let displayExpected = spec.expectedResult;

		if(validator === Validator.OBSERVER_CALLED_TIMES) {
			displayActual = spec.actualResult[OBSERVER_STORE].callCount;
		} else if(validator === Validator.OBSERVER_CALLED_WITH) {
			displayActual = spec.actualResult[OBSERVER_STORE].calls[spec.actualResult[OBSERVER_STORE].calls.length-1];
		}

		logError(`> Expected ${stringify(displayActual)} to be ${stringify(displayExpected)}`);
		spec.failed = true;
	}
}

function generateFeatures(spec, matchers) {
	return {
		expect(actual) {
			spec.actualResult = actual;
			return matchers;
		},
		observe(obj, fn, callActual = true) {
			const originalFn = obj[fn].bind(obj);
			obj[fn] = new Proxy(obj[fn], {
				apply(target, thisArg, args) {
					const o = obj[fn][OBSERVER_STORE];
					o.callCount++;
					o.calls.push(args);

					if(callActual) return Reflect.apply(target, thisArg, args);
				}
			});

			obj[fn][OBSERVER_STORE] = { obj, fn, originalFn, callCount: 0, calls: [] };

			spec.observedFunctions.add(obj[fn]);
		}
	};
}

function restoreObservedFunctions(spec) {
	for(const observer of spec.observedFunctions.values()) {
		const store = observer[OBSERVER_STORE];
		store.obj[store.fn] = store.originalFn;
	}
}

function generateMatchers(spec) {
	return {
		toBe(expected) {
			validate(spec, expected, Validator.EXACT);
		},
		toEqual(expected) {
			validate(spec, expected, Validator.EQUAL);
		},
		toHaveBeenCalled() {
			validate(spec, true, Validator.OBSERVER_CALLED);
		},
		toHaveBeenCalledTimes(expected) {
			validate(spec, expected, Validator.OBSERVER_CALLED_TIMES);
		},
		toHaveBeenCalledWith(expected) {
			validate(spec, expected, Validator.OBSERVER_CALLED_WITH);
		},
	};
}

setTimeout(async () => {
	let tested = 0;
	let failures = 0;

	for(const spec of TEST_QUEUE) {
		tested++;
		log('');
		log(spec.descriptor, Colors.DIM);

		const matchers = generateMatchers(spec);
		const features = generateFeatures(spec, matchers);

		await spec.body(features);

		if(spec.failed) {
			failures++;
			logError('[✖] Failed.');
		} else {
			log('[✔] Passed!', Colors.GREEN_FG);
		}

		restoreObservedFunctions(spec);
	}

	log(`\n========================\nTested ${tested} specs`);

	if(failures) {
		logError(`${failures} failures, ${tested - failures} passing`);
	} else {
		log('All passed! :)', Colors.GREEN_FG);
	}
	log('');
});