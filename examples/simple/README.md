seneca-auth examples
====================

### Simple example

Notes:

This example shows the usage of:

		* The user plugin
		* The auth plugin

An express server serves the static login page as the starting-point
of the example.

The login and register functionality is handled by the seneca-auth
plugin, which takes the requests to 'auth/*', verifies the inputs.

The single-page login shows how to verify users using client-side ajax calls
to seneca-auth.  Notice how it still uses a call to the /auth/login action 
internally, and then manipulates the DOM through the callback function.

As db store the implementation uses the mem-store as default store for seneca. Please take in consideration
that when you restart the server all data will be lost.

For more questions about the seneca-auth plugin, check out
https://github.com/rjrodger/seneca-auth

Feel free to contact me on Twitter if you have any questions! :) @rjrodger


### Install

```sh
npm install
```

### Configure

Copy config.template.js to config.mine.js

Run with:

$ node app.js

Or to use a custom port:
$ node app.js --seneca.options.main.port=4000

Then visit:
http://localhost:3000



