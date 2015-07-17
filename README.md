seneca-auth - a [Seneca](http://senecajs.org) plugin
======================================================

## Seneca Auth Plugin

A user authentication plugin, using [PassportJS](http://passportjs.org).

[![Build Status](https://travis-ci.org/rjrodger/seneca-auth.png?branch=master)](https://travis-ci.org/rjrodger/seneca-auth)

[![NPM](https://nodei.co/npm/seneca-auth.png)](https://nodei.co/npm/seneca-auth/)
[![NPM](https://nodei.co/npm-dl/seneca-auth.png)](https://nodei.co/npm-dl/seneca-auth/)

For a gentle introduction to Seneca itself, see the
[senecajs.org](http://senecajs.org) site.

If you're using this plugin module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.4.0

Tested on: Seneca 0.5.19, Node 0.10.29


### Install

```sh
npm install seneca-auth
```

## Migration guide

Please see bellow the migration guide from older version to 0.4.x or above version.

A large part of the internal functionality of seneca-auth is now implemented as external plugins. Some of them are loaded by default in order to offer the basic functionality, some must be loaded explicitly.

### Plugins

|        Functionality    | Loaded by default |                                 plugin                                                  |
|-------------------------|-------------------|-----------------------------------------------------------------------------------------|
| Local strategy auth     | No                | [seneca-local-auth](https://github.com/mirceaalexandru/seneca-local-auth)               |
| Facebook  strategy auth | No                | [seneca-facebook-auth](https://github.com/nherment/seneca-facebook-auth)                |
| Github strategy auth    | No                | [seneca-github-auth](https://github.com/nherment/seneca-github-auth)                    |
| Google  strategy auth   | No                | [seneca-google-auth](https://github.com/nherment/seneca-google-auth)                    |
| LinkedIn strategy auth  | No                | [seneca-linkedin-auth](https://github.com/nherment/seneca-linkedin-auth)                |
| Twitter strategy auth   | No                | [seneca-twitter-auth](https://github.com/nherment/seneca-twitter-auth)                  |
| Redirect                | Yes               | [seneca-auth-redirect](https://github.com/mirceaalexandru/seneca-auth-redirect)         |
| Cookie token            | Yes               | [seneca-auth-token-cookie](https://github.com/mirceaalexandru/seneca-auth-token-cookie) |
| Header token            | No                | [seneca-auth-token-header](https://github.com/mirceaalexandru/seneca-auth-token-header) |
| Url matcher             | Yes               | [seneca-auth-urlmatcher](https://github.com/mirceaalexandru/seneca-auth-urlmatcher)     |

Check the documentation for each plugin for details.

### Options deprecated or no longer supported

Some options are no longer supported:
   * service - the service array that defines the auth strategies is no longer supported. Instead of this the auth strategies plugins must be loaded explicitly, each with its own options.
   * sendemail - the send email option (and send email functionality) is no longer supported.
   * email - see above

When one of these parameters are provided to seneca-auth it will be considered a fatal error. Please remove them from seneca-auth options and check the documentation.

Some options are deprecated:
   * tokenkey - this parameter is deprecated. It is now an option for one of the two plugins that are used for storing/retrieving the auth-token from request/response - [seneca-auth-token-cookie](https://github.com/mirceaalexandru/seneca-auth-token-cookie) or [seneca-auth-token-header](https://github.com/mirceaalexandru/seneca-auth-token-header)

## JSON API and Redirects

NOTE: Take a look at the <a href="http://github.com/rjrodger/seneca-examples">user accounts example</a> or <a href="https://github.com/rjrodger/seneca-mvp">seneca-mvp example</a>.

### Redirect

The redirect functionality is now implemented as a separate plugin. Please see [seneca-auth-redirect](https://github.com/mirceaalexandru/seneca-auth-redirect) documentation for details.

The redirect plugin is loaded by default by seneca-auth.

### login

Login an existing user and set a login token. A new login entity is created for each login.

   * default url path: _/auth/login_
   * options property: _urlpath.login_


### logout

Logout an existing user with an active login. The login entity is updated to reflect the end of the login.

   * default url path: _/auth/logout_
   * options property: _urlpath.logout_


### instance

Get the details of an existing, logged in user.

   * default url path: _/auth/instance_
   * options property: _urlpath.instance_

