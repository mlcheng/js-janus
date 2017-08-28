# js-janus

Looking for a no-nonsense testing framework for JavaScript? This is probably what you came for. Named after [Janus](https://wikipedia.org/wiki/Janus) - the ancient Roman gatekeeper - Janus.js is here to keep wrong code from entering your codebase.

## Usage
Usage is fairly simple. Let's first setup an `add()` function.

```javascript
const add = (...nums) => nums.reduce((total, n) => total + n);
```

To test this function, first set the description of the test case.

```javascript
Test('1+1 equals 2');
```

Specify the unit test and inject tools the test needs to complete

```javascript
Test('1+1 should be 2', ({ expect }) => {
	expect(add(1, 1)).toBe(2);
});
```

A full list of tools is described below.

## Advanced usage
This test framework also has some extras that may be useful. Your unit test can use destructuring assignments to receive tools and dependencies needed to complete the test.

### Expectations
The most important function to inject into your test is `expect`. This function allows you to make assertions on your code.

```js
Test('Expectations', ({ expect }) => {
	const a = 100;
	expect(a).toBe(100);
})
```

Supported comparators are below.

#### `.toBe()`
This comparator does a strict equality check (`===`) when comparing the expected and actual result.

#### `.toEqual()`
This comparator performs a deep equality check. Expected and actual values may not be the same object, but if their values are the same, this comparator returns true.

#### `.toHaveBeenCalled()`
This comparator is used with observed functions. If an observed function is called, this comparator returns true.

#### `.toHaveBeenCalledWith()`
This comparator is used with observed functions. Use it to determine if an observed function is called with specific parameters.

### Observing functions
Inject this function into your test to observe function calls. Syntax is similar to Jasmine's spyOn.

```js
Test('Observed functions', ({ expect, observe }) => {
	const obj = {
		fn() {}
	};

	observe(obj, 'fn');
	obj.fn();

	expect(obj.fn).toHaveBeenCalled();
});
```

By default, the observed function is called as usual. To stub it out, simply pass `false` as the third argument to `observe()`.

```js
observe(obj, 'fn', false);
```

### Performing asynchronous tasks
Inject this function to perform asynchronous tasks within your test.

```js
Test('Asynchronous functions', ({ expect, sync }) => {
	let a = 100;
	sync(() => new Promise(resolve) => {
		a = 200;
		resolve();
	});

	expect(a).toBe(200);
});
```

## Real-world usage
When you want to test your code, require `test.js` in your file. An exported `inject()` function will allow you to inject any file into the test scenario and run it in the context of your test. The syntax of `inject()` is as follows:

```javascript
inject(context, relativePath);
```

Where `context` is usually the NodeJS global `__dirname`. A sample test file would look something like this:

```javascript
'use strict';

const { Test, inject } = require('path/to/test.js');
inject(__dirname, '../relative/path/to/file-to-test.js');

// Begin tests
Test(...)
```