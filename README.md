# js-janus

Looking for a no-nonsense testing framework for JavaScript? This is probably what you came for. Named after [Janus](https://wikipedia.org/wiki/Janus) - the ancient Roman gatekeeper - Janus.js is here to keep wrong code from entering your codebase.

**Caution**: This probably _isn't_ what you came for. As is, the framework still causes side effects everywhere - which is the problem it was trying to solve. [This commit](https://github.com/mlcheng/js-janus/commit/87269fe8a3cd2113f6e1972f3e001d8d1264e7fe) probably fixes it, but introduces an extra dependency on a third-party library.

## Usage
Usage is fairly simple. Let's first setup an `add()` function.

```javascript
const add = (...nums) => nums.reduce((total, n) => total + n);
```

To test this function, first set the description of the test case.

```javascript
Test('1+1 equals 2');
```

Specify the unit test and inject tools that the test needs.

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
Inject `observe` into your test to observe function calls. The syntax is similar to Jasmine's spyOn.

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

By default, the observed function is called as usual if any tests invoke it. To stub it out, simply pass `false` as the third argument to `observe()`.

```js
observe(obj, 'fn', false);
```

### Performing asynchronous tasks
Inject `async` to perform asynchronous tasks within your test. This function includes a callback that you must call in order for Janus to know the test has finished. If the callback isn't invoked 5000ms, an error will be logged and the test will fail.

```js
Test('Asynchronous functions', ({ async, expect }) => async(done => {
	let a = 100;
	setTimeout(() => {
		a = 200;
		expect(a).toBe(200);

		done();
	}, 500);
}));
```

## Real-world usage
When you want to test your code, require `test.js` in your file. An exported `inject()` function will allow you to inject any file into the test scenario and run it in the context of your test. The syntax of `inject()` is as follows:

```javascript
inject(context, relativePath);
```

Where `context` is usually the NodeJS global `__dirname`. A sample test file would look something like this:

```javascript
'use strict';

const { Test, fTest, inject } = require('path/to/test.js');
inject(__dirname, '../relative/path/to/file-to-test.js');

// Begin tests
Test(...)
```

Similar to Jasmine, `fTest` focuses on the tests specified and will only run those marked with `fTest`.