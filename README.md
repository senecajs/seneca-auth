# seneca-auth - Node.js module

## A user authentication plugin for the [Seneca](/rjrodger/seneca) toolkit

Dependencies: [seneca-user](/rjrodger/seneca-user)

Current Version: 0.2.9

Tested on: Node 0.10.24, Seneca 0.5.16

[![Build Status](https://travis-ci.org/rjrodger/seneca-auth.png?branch=master)](https://travis-ci.org/rjrodger/seneca-auth)


NOTE: documentation is in progress. Take a look at the <a href="http://github.com/rjrodger/seneca-examples">user accounts example</a>.



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

### plugins

| Provider |                                plugin                                    |                                     example                                      |
|----------|--------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| local    | embedded                                                                 | [seneca-mvp](https://github.com/rjrodger/seneca-mvp)                             |
| Facebook | [seneca-facebook-auth](https://github.com/nherment/seneca-facebook-auth) | [facebook](https://github.com/nherment/seneca-facebook-auth/tree/master/example) |
| Github   | [seneca-github-auth](https://github.com/nherment/seneca-github-auth)     | [github](https://github.com/nherment/seneca-github-auth/tree/master/example)     |
| Google   | [seneca-google-auth](https://github.com/nherment/seneca-google-auth)     | [google](https://github.com/nherment/seneca-google-auth/tree/master/example)     |
| LinkedIn | [seneca-linkedin-auth](https://github.com/nherment/seneca-linkedin-auth) | [linkedin](https://github.com/nherment/seneca-linkedin-auth/tree/master/example) |
| Twitter  | [seneca-twitter-auth](https://github.com/nherment/seneca-twitter-auth)   | [twitter](https://github.com/nherment/seneca-twitter-auth/tree/master/example)   |

Seneca-auth embeds a default provider that allows local user registration/login without using a third party identity
provider.


