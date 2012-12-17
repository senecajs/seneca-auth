# seneca-auth - Node.js module

## A user authentication plugin for the [Seneca](/rjrodger/seneca) toolkit

Dependencies: [seneca-user](/rjrodger/seneca-user)

Current Version: 0.1.1

[![Build Status](https://secure.travis-ci.org/rjrodger/seneca-auth.png?b)](http://travis-ci.org/rjrodger/seneca-auth)

NOTE: documentation is in progress



## JSON API and Redirects

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




 



