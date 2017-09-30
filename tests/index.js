/***********************************************

  "index.js"

  Created by Michael Cheng on 08/28/2017 14:42
            http://michaelcheng.us/
            michael@michaelcheng.us
            --All Rights Reserved--

***********************************************/

'use strict';

/* globals require */
const { fTest, Test, inject, janus } = require('../janus.js');


Test('fTest() is a function', ({ expect }) => {
	expect(typeof fTest).toBe('function');
});

Test('inject() is a function', ({ expect }) => {
	expect(typeof inject).toBe('function');
});

Test('Tests receive injected tools needed to run tests', ({ expect }) => {
	const { toBe, toEqual, toHaveBeenCalled, toHaveBeenCalledWith } = expect();

	expect(typeof toBe).toBe('function');
	expect(typeof toEqual).toBe('function');
	expect(typeof toHaveBeenCalled).toBe('function');
	expect(typeof toHaveBeenCalledWith).toBe('function');
});

Test('Custom matcher functions can be added', ({ expect }) => {
	janus.addMatcher('toContain', (expected, actual) => {
		return actual.includes(expected);
	});

	expect('hello').toContain('ll');
});

Test('The EXACT validation function determines if 2 inputs are the same', ({ expect }) => {
	expect(Test.prototype.ValidationFunction.EXACT('1', '1')).toBe(true);
});

Test('The EQUALS validation function determines if 2 inputs are equal', ({ expect }) => {
	expect(Test.prototype.ValidationFunction.EQUALS({
		prop: 'value'
	}, {
		prop: 'value'
	})).toBe(true);
});

Test('The CALLED validation function determines if an observed function was called', ({ expect, observe }) => {
	const obj = {
		fn() {}
	};
	observe(obj, 'fn');

	expect(Test.prototype.ValidationFunction.CALLED(obj.fn)).toBe(false);

	obj.fn();
	expect(Test.prototype.ValidationFunction.CALLED(obj.fn)).toBe(true);
});

Test('The CALLED_WITH validation function determines if an observed function was called with the specified arguments', ({ expect, observe }) => {
	const obj = {
		fn() {}
	};
	observe(obj, 'fn');

	obj.fn('hello');
	expect(Test.prototype.ValidationFunction.CALLED_WITH(obj.fn, ['hello'])).toBe(true);
});

Test('stringifyArgs() displays function arguments as a string', ({ expect }) => {
	const args = ['lynn', 'honey'];
	expect(Test.prototype.stringifyArgs(args)).toBe('"lynn", "honey"');
});

Test('stringify() surrounds strings with quotes', ({ expect }) => {
	expect(Test.prototype.stringify('hello')).toBe('"hello"');
});

Test('stringify() can display objects', ({ expect }) => {
	const obj = {
		prop: {
			foo: 'bar'
		}
	};

	expect(Test.prototype.stringify(obj)).toBe('{"prop":{"foo":"bar"}}');
});

Test('stringify() can display functions', ({ expect }) => {
	const obj = {
		fn() {},
		foo: 'bar'
	};

	expect(Test.prototype.stringify(obj)).toBe('{"fn":"Function() { [native code] }","foo":"bar"}');
});

Test('Tests can be asynchronous', ({ async, expect }) =>
	async(done => {
		let a = 100;
		setTimeout(() => {
			a = 200;

			expect(a).toBe(200);
			done();
		}, 100);
	})
);

Test('Observed functions can determine if they were called', ({ expect, observe }) => {
	const obj = {
		fn() {}
	};

	observe(obj, 'fn');
	obj.fn();

	expect(obj.fn).toHaveBeenCalled();
});

Test('Observed functions call through to the actual function by default', ({ expect, observe }) => {
	let value = 100;

	const obj = {
		changeValue() {
			value = 200;
		}
	};

	observe(obj, 'changeValue');
	obj.changeValue();

	expect(value).toBe(200);
});

Test('Observed functions do not have to call through to the actual function', ({ expect, observe }) => {
	let value = 100;

	const obj = {
		changeValue() {
			value = 200;
		}
	};

	observe(obj, 'changeValue', false);
	obj.changeValue();

	expect(value).toBe(100);
});

Test('Observed functions can determine what arguments they were called with', ({ expect, observe }) => {
	let value = 100;

	const obj = {
		changeValueTo(v) {
			value = v;
		}
	};

	observe(obj, 'changeValueTo');
	obj.changeValueTo(200);

	expect(value).toBe(200);
	expect(obj.changeValueTo).toHaveBeenCalledWith(200);
});