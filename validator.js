/***********************************************

  "validator.js"

  Created by Michael Cheng on 5/25/2020 11:03:24 AM
            http://michaelcheng.us/
            michael@michaelcheng.us
            --All Rights Reserved--

***********************************************/

'use strict';

function objEqual(a, b) {
	// http://stackoverflow.com/a/16788517/4230736
	if(a == null || b == null) return a === b;
	if(a.constructor !== b.constructor) return false;
	if(a instanceof Function) return a === b;
	if(a instanceof RegExp) return a === b;
	if(a === b || a.valueOf() === b.valueOf()) return true;
	if(Array.isArray(a) && a.length !== b.length) return false;
	if(a instanceof Date) return false;
	if(!(a instanceof Object)) return false;
	if(!(b instanceof Object)) return false;

	var level = Object.keys(a);
	return Object.keys(b).every(k => ~level.indexOf(k)) &&
		level.every(k => equal(a[k], b[k]));
}

function equal(spec) {
	const expected = spec.expectedResult, actual = spec.actualResult;
	return objEqual(expected, actual);
}

function exact(spec) {
	return spec.expectedResult === spec.actualResult;
}

export const OBSERVER_STORE = Symbol('janus-observer-store');

function observerCalled(spec) {
	const fn = spec.actualResult;
	return fn[OBSERVER_STORE].callCount > 0;
}

function observerCalledTimes(spec) {
	const fn = spec.actualResult;
	return fn[OBSERVER_STORE].callCount === spec.expectedResult;
}

function observerCalledWith(spec) {
	const fn = spec.actualResult;
	return objEqual(fn[OBSERVER_STORE].calls[fn[OBSERVER_STORE].calls.length-1], spec.expectedResult);
}

export const Validator = {
	EQUAL: equal,
	EXACT: exact,
	OBSERVER_CALLED: observerCalled,
	OBSERVER_CALLED_TIMES: observerCalledTimes,
	OBSERVER_CALLED_WITH: observerCalledWith,
};