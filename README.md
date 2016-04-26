![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) Auth Plugin

seneca-auth
============

A user authentication plugin, using [PassportJS](http://passportjs.org) for Express and [Bell](https://github.com/hapijs/bell) for Hapi.

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
[![Gitter chat][gitter-badge]][gitter-url]


Table of Contents                                                                                                                                                                                                    
=================                                                                                                                                                                                                    
                                                                                                                                                                                                                     
  * [Install](#install)                                                                                                                                                                                              
  * [Migration guide](#migration-guide)                                                                                                                                                                              
  * [Plugins and modules](#plugins-and-modules)                                                                                                                                                                      
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

# Install

```sh
npm install seneca-auth
```

# Migration guide

Please see bellow the migration guide from older version to 0.4.x or above version.

A large part of the internal functionality of seneca-auth is now implemented as external plugins. Some of them are loaded by default in order to offer the basic functionality, some must be loaded explicitly.

# Plugins and modules

|        Functionality    | Loaded by default |                                 plugin                                                      |
|-------------------------|-------------------|---------------------------------------------------------------------------------------------|
| Local strategy auth     | No                | [seneca-local-auth](https://github.com/mirceaalexandru/seneca-local-auth)                   |
| Facebook  strategy auth | No                | [seneca-facebook-auth](https://github.com/nherment/seneca-facebook-auth)                    |
| Github strategy auth    | No                | [seneca-github-auth](https://github.com/nherment/seneca-github-auth)                        |
| Google  strategy auth   | No                | [seneca-google-auth](https://github.com/nherment/seneca-google-auth)                        |
| LinkedIn strategy auth  | No                | [seneca-linkedin-auth](https://github.com/nherment/seneca-linkedin-auth)                    |
| Twitter strategy auth   | No                | [seneca-twitter-auth](https://github.com/nherment/seneca-twitter-auth)                      |
| Redirect                | Yes               | [auth-redirect](https://github.com/mirceaalexandru/auth-redirect)                           |
| Cookie token            | Yes               | [auth-token-cookie](https://github.com/mirceaalexandru/auth-token-cookie)                   |
| Header token            | No                | [seneca-auth-token-header](https://github.com/mirceaalexandru/seneca-auth-token-header)     |
| Url matcher             | Yes               | [auth-urlmatcher](https://github.com/mirceaalexandru/auth-urlmatcher)                       |
| Restrict Login          | No                | [seneca-auth-restrict-login](https://github.com/mirceaalexandru/seneca-auth-restrict-login) |

Check the documentation of each plugin for details.

# Note about node version support

Hapi is supported only if using node 4 or greater. When using node 0.1x only Express is supported.

# Options deprecated or no longer supported

Some options are no longer supported:
   * `service` - the service array that defines the auth strategies is no longer supported. Instead of this the auth strategies plugins must be loaded explicitly, each with its own options.
   * `sendemail` - the send email option (and send email functionality) is no longer supported.
   * `email` - see above

When one of these parameters are provided to *seneca-auth* it will be considered a fatal error. Please remove them from *seneca-auth* options and check the documentation.

Some options are deprecated:
   * `tokenkey` - this parameter is deprecated. It is now an option for one of the two plugins that are used for storing/retrieving the auth-token from request/response - [seneca-auth-token-cookie](https://github.com/mirceaalexandru/seneca-auth-token-cookie) or [seneca-auth-token-header](https://github.com/mirceaalexandru/seneca-auth-token-header)

# Restrict Login

Different conditions for login can be added by simply overriding the default behavior of seneca action with pattern:

    role: 'auth', restrict: 'login'

This function must return:

   * an object with at least `{ ok: true }` in case that login is allowed based on the implemented rules
   * an object with at least `{ ok: false, why: 'reason' }` in case that login is not allowed based on the implemented rules.

An example of this implementation is provided by the plugin [seneca-auth-restrict-login](https://github.com/mirceaalexandru/seneca-auth-restrict-login).
The restrict condition implemented by this plugin is based on the existence of a cookie value in the request.

If more conditions are required these can be implemented in separated seneca actions. All actions can then be added to seneca but make sure
to call `seneca.prior` from each action to make sure that all conditions in the chain are verified.

# JSON API and Redirects

**NOTE:** Take a look at the [user accounts example](http://github.com/rjrodger/seneca-examples) or [seneca-mvp example](https://github.com/rjrodger/seneca-mvp).

## Redirect

The redirect functionality is now implemented as a separate module. Please see [auth-redirect](https://github.com/mirceaalexandru/auth-redirect) documentation for details.

The redirect module is loaded by default by *seneca-auth*.

# API

## login

Login an existing user and set a login token. A new login entity is created for each login.

   * default url path: `/auth/login`
   * options property: `urlpath.login`


## logout

Logout an existing user with an active login. The login entity is updated to reflect the end of the login.

   * default url path: `/auth/logout`
   * options property: `urlpath.logout`


## user - previously instance

Get the details of an existing, logged in user.

   * default url path: `/auth/user`
   * options property: `urlpath.user`

This was previously the `/auth/instance`.

## register

Register a user and login automatically.

   * default url path: `/auth/register`
   * options property: `urlpath.register`
   * body should contain user information. Please refer to [seneca-user](https://github.com/rjrodger/seneca-user) at ``cmd: register`` documentation for details.

## create reset

Create a reset token

   * default url path: `/auth/create_reset`
   * options property: `urlpath.create_reset`
   * Please refer to [seneca-user](https://github.com/rjrodger/seneca-user) at `cmd: create_reset` documentation for details.
   
Note: The response will not contain reset token or user data. The client of this application should make sure to re-define this action
and send email to the user with reset token.


## load reset

Load a user entity using a reset token.

   * default url path: `/auth/load_reset`
   * options property: `urlpath.load_reset`
   * Please refer to [seneca-user](https://github.com/rjrodger/seneca-user) at `cmd: load_reset` documentation for details.

## execute reset

Execute a password reset action.

   * default url path: `/auth/execute_reset`
   * options property: `urlpath.execute_reset`
   * Please refer to [seneca-user](https://github.com/rjrodger/seneca-user) at `cmd: execute_reset` documentation for details.

## update user

Update user data.

   * default url path: `/auth/update_user`
   * options property: `urlpath.update_user`
   * Please refer to [seneca-user](https://github.com/rjrodger/seneca-user) at `cmd: update_user` documentation for details.

## change password

Change user password.

   * default url path: `/auth/change_password`
   * options property: `urlpath.change_password`
   * Please refer to [seneca-user](https://github.com/rjrodger/seneca-user) at `cmd: change_password` documentation for details.


# Example of using seneca-auth with Hapi


```
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

# Test

```sh
npm test
```


[npm-badge]: https://badge.fury.io/js/seneca-auth.svg
[npm-url]: https://badge.fury.io/js/seneca-auth
[travis-badge]: https://api.travis-ci.org/senecajs/seneca-auth.svg
[travis-url]: https://travis-ci.org/senecajs/seneca-auth
[coveralls-badge]:https://coveralls.io/repos/senecajs/seneca-auth/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/senecajs/seneca-auth?branch=master
[david-badge]: https://david-dm.org/senecajs/seneca-auth.svg
[david-url]: https://david-dm.org/senecajs/seneca-auth
[gitter-badge]: https://badges.gitter.im/senecajs/seneca.png
[gitter-url]: https://gitter.im/senecajs/seneca
