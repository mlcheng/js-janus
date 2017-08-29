/***********************************************

  "index.js"

  Created by Michael Cheng on 08/28/2017 14:42
            http://michaelcheng.us/
            michael@michaelcheng.us
            --All Rights Reserved--

***********************************************/

'use strict';

/* globals require */
const { Test, inject } = require('../janus.js');

Test('inject() is a function', ({ expect }) => {
	expect(typeof inject).toBe('function');
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

Test('colorize() logs the output color to the console', ({ expect, observe }) => {
	observe(console, 'log', false);

	Test.prototype.colorize(true);

	expect(console.log).toHaveBeenCalled();
});

Test('decolorize() logs the output color to the console', ({ expect, observe }) => {
	observe(console, 'log', false);

	Test.prototype.decolorize();

	expect(console.log).toHaveBeenCalled();
});

Test('Asynchronous actions can be performed inside tests', ({ async, expect }) => {
	async(done => {
		let a = 100;
		setTimeout(() => {
			a = 200;
			expect(a).toBe(200);

			done();
		}, 100);
	});
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

Test('Observed functions know what they were called with', ({ expect, observe }) => {
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