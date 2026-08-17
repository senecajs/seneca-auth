![Seneca](http://senecajs.org/files/assets/seneca-logo.png)

> A [Seneca.js](http://senecajs.org) Auth Plugin

# seneca-auth

A user authentication plugin, using [PassportJS](http://passportjs.org) for Express and [Bell](https://github.com/hapijs/bell) for Hapi.

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
[![Gitter chat][gitter-badge]][gitter-url]

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Table of Contents
  * [Install](#install)
  * [Migration guide](#migration-guide)
  * [Plugins and modules](#plugins-and-modules)
    * [Disabling default plugins](#disabling-default-plugins)
  * [Note about node version support](#note-about-node-version-support)
  * [Options deprecated or no longer supported](#options-deprecated-or-no-longer-supported)
  * [Restrict Login](#restrict-login)
  * [JSON API and Redirects](#json-api-and-redirects)
    * [Redirect](#redirect)
  * [API](#api)
    * [login](#login)
    * [logout](#logout)
    * [user - previously instance](#user---previously-instance)
    * [register](#register)
    * [create reset](#create-reset)
    * [load reset](#load-reset)
    * [execute reset](#execute-reset)
    * [update user](#update-user)
    * [change password](#change-password)
  * [Example of using seneca-auth with Hapi](#example-of-using-seneca-auth-with-hapi)
  * [Test](#test)


Lead Maintainers: [Mircea Alexandru](https://github.com/mirceaalexandru) and [Mihai Dima](https://github.com/mihaidma)

For a gentle introduction to Seneca itself, see the
[senecajs.org](http://senecajs.org) site.

If you're using this plugin module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

### Seneca compatibility
Supports Seneca versions **1.x** - **3.x**

## Install

```sh
npm install seneca-auth
```

## Quick Example

```js
var seneca = require('seneca')()
seneca.use('user')
seneca.use('entity')
seneca.use('auth')
```

### Using seneca-auth with Hapi

```js
var _ = require('lodash')

var Chairo = require('chairo')
var Hapi = require('hapi')
var Bell = require('bell')
var Hapi_Cookie = require('hapi-auth-cookie')

var server = new Hapi.Server()
server.connection({port: 3000})

server.register([Hapi_Cookie, Bell, Chairo], function (err) {
  var si = server.seneca

  si.use('user')
  si.use('entity')
  si.use(
    require('seneca-auth'),
    {
      secure: true,
      restrict: '/api'
    }
  )

  si.add({role: 'test', cmd: 'service'}, function (args, cb) {
    return cb(null, {something: 'else'})
  })

  si.act({
    role: 'web',
    plugin: 'test',
    use: {
      prefix: '/api',
      pin: {role: 'test', cmd: '*'},
      map: {
        service: {GET: true}
      }
    }
  }, function(err){

    server.start(function () {
      console.log(server.info.uri)
    })
  })
})
```

## More Examples

See the [user accounts example](http://github.com/rjrodger/seneca-examples) or
[seneca-mvp example](https://github.com/senecajs/seneca-mvp) for more complete
usage examples.

### Disabling default plugins

Disable default plugins by setting the flags on `options.default_plugins` to false.
For example, if you want to use [auth-token-header](https://github.com/senecajs/auth-token-header)
instead of [auth-token-cookie](https://github.com/senecajs/auth-token-cookie):

```js
seneca.use(require('seneca-auth', {
    default_plugins: { authTokenCookie: false }
}))
seneca.use(require('auth-token-header'))
```

## Motivation

This plugin provides user authentication for Seneca-based applications,
supporting PassportJS for Express and Bell for Hapi frameworks.

A large part of the internal functionality is implemented as external plugins:

| Functionality | Loaded by default | Plugin |
|---|---|---|
| Local strategy auth | Yes | [seneca-local-auth](https://github.com/senecajs/seneca-local-auth) |
| Facebook strategy auth | No | [seneca-facebook-auth](https://github.com/senecajs/seneca-facebook-auth) |
| Github strategy auth | No | [seneca-github-auth](https://github.com/senecajs/seneca-github-auth) |
| Google strategy auth | No | [seneca-google-auth](https://github.com/senecajs/seneca-google-auth) |
| LinkedIn strategy auth | No | [seneca-linkedin-auth](https://github.com/senecajs/seneca-linkedin-auth) |
| Twitter strategy auth | No | [seneca-twitter-auth](https://github.com/senecajs/seneca-twitter-auth) |
| Redirect | Yes | [auth-redirect](https://github.com/senecajs/auth-redirect) |
| Cookie token | Yes | [auth-token-cookie](https://github.com/senecajs/auth-token-cookie) |
| Header token | No | [auth-token-header](https://github.com/senecajs/auth-token-header) |
| Url matcher | Yes | [auth-urlmatcher](https://github.com/senecajs/auth-urlmatcher) |
| Restrict Login | No | [auth-restrict-login](https://github.com/senecajs/auth-restrict-login) |

### Note about node version support

Hapi is supported only if using node 4 or greater. When using node 0.1x only Express is supported.

### Options deprecated or no longer supported

Some options are no longer supported:
- `service` - the service array is no longer supported. Auth strategies plugins must be loaded explicitly.
- `sendemail` - the send email option is no longer supported.
- `email` - see above.

Some options are deprecated:
- `tokenkey` - now an option for [auth-token-cookie](https://github.com/senecajs/auth-token-cookie) or [auth-token-header](https://github.com/senecajs/auth-token-header).

## Support

If you have any questions, [open an issue](https://github.com/senecajs/seneca-auth/issues)
or contact the [Senecajs team](https://senecajs.org/).

### Restrict Login

Different conditions for login can be added by overriding the default behavior of seneca action with pattern `role: 'auth', restrict: 'login'`.

This function must return:
- `{ ok: true }` if login is allowed
- `{ ok: false, why: 'reason' }` if login is not allowed

See [auth-restrict-login](https://github.com/senecajs/auth-restrict-login) for an example.

## API

### login

Login an existing user and set a login token.

- default url path: `/auth/login`
- options property: `urlpath.login`

### logout

Logout an existing user with an active login.

- default url path: `/auth/logout`
- options property: `urlpath.logout`

### user

Get the details of an existing, logged in user.

- default url path: `/auth/user`
- options property: `urlpath.user`

### register

Register a user and login automatically.

- default url path: `/auth/register`
- options property: `urlpath.register`

### create reset

Create a reset token.

- default url path: `/auth/create_reset`
- options property: `urlpath.create_reset`

### load reset

Load a user entity using a reset token.

- default url path: `/auth/load_reset`
- options property: `urlpath.load_reset`

### execute reset

Execute a password reset action.

- default url path: `/auth/execute_reset`
- options property: `urlpath.execute_reset`

### update user

Update user data.

- default url path: `/auth/update_user`
- options property: `urlpath.update_user`

### change password

Change user password.

- default url path: `/auth/change_password`
- options property: `urlpath.change_password`

### JSON API and Redirects

The redirect functionality is implemented as a separate module.
See [auth-redirect](https://github.com/senecajs/auth-redirect) for details.

## Contributing

The [Senecajs org][senecajs-org] encourages open participation. If you feel you
can help in any way, be it with documentation, examples, extra testing,
or new features please get in touch.

```sh
npm test
```

## Background

This plugin was created to provide standardized authentication for the
Seneca microservices framework. It is part of the
[Voxgig](https://www.voxgig.com) open source initiative.

## License

Copyright (c) 2012 - 2016, Richard Rodger and other contributors.
Licensed under [MIT][].

[MIT]: ./LICENSE
[senecajs-org]: https://github.com/senecajs/
[npm-badge]: https://badge.fury.io/js/seneca-auth.svg
[npm-url]: https://badge.fury.io/js/seneca-auth
[travis-badge]: https://api.travis-ci.org/senecajs/seneca-auth.svg
[travis-url]: https://travis-ci.org/senecajs/seneca-auth
[coveralls-badge]: https://coveralls.io/repos/senecajs/seneca-auth/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/senecajs/seneca-auth?branch=master
[david-badge]: https://david-dm.org/senecajs/seneca-auth.svg
[david-url]: https://david-dm.org/senecajs/seneca-auth
[gitter-badge]: https://badges.gitter.im/senecajs/seneca.png
[gitter-url]: https://gitter.im/senecajs/seneca
