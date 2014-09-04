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

Current Version: 0.3.0

Tested on: Seneca 0.5.19, Node 0.10.29


### Install

```sh
npm install seneca-auth
```

## JSON API and Redirects


NOTE: documentation is in progress. Take a look at the <a href="http://github.com/rjrodger/seneca-examples">user accounts example</a>.


The API endpoints return a HTTP redirect when a form submission is
made against them. That is, when the Content-Type header is one of:

   * application/x-www-form-urlencoded
   * multipart/form-data

For _application/json_, a JSON response is returned instead of a redirect.

You can control this behavior explicitly by providing a redirect=yes|no query parameter:

     /auth/login?redirect=yes

You can also control this behaviour using the plugin options:

     seneca.use('auth', {redirect:{always:true}} )

With _always:true_, a redirect always occurs.

The default behaviour is to redirect if no other rule above applies.

The module takes a _restrict_ parameter (string or array) to allow only authenticated requests to those 
endpoints. It will return HTTP code 401 (Unauthorized) for requests matching these paths.

    seneca.use('auth', {restrict:['/api/']})



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




 



