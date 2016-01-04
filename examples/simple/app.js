/* Copyright (c) 2012-2015 Richard Rodger, MIT License */
'use strict'

var Http = require('http')

var Express = require('express')
var BodyParser = require('body-parser')
var CookieParser = require('cookie-parser')
var MethodOverride = require('method-override')
var Session = require('express-session')
var ServeStatic = require('serve-static')

// create a seneca instance
var seneca = require('seneca')()

// load configuration for plugins
// top level properties match plugin names
// copy template config.template.js to config.mine.js and customize
var options = seneca.options('config.mine.js')

// use the user and auth plugins
// the user plugin gives you user account business logic
seneca.use('user')

// the auth plugin handles HTTP authentication
seneca.use('auth', options.auth)

// the local-auth handles local auth strategy
seneca.use('local-auth')

// use the express module in the normal way
var app = Express()
app.enable('trust proxy')

app.use(CookieParser())
app.use(Express.query())
app.use(BodyParser.urlencoded({extended: true}))
app.use(MethodOverride())
app.use(BodyParser.json())

// Use in-memory sessions so OAuth will work
// In production, use redis or similar
app.use(Session({secret: 'seneca'}))

app.use(ServeStatic(__dirname + '/public'))

// add seneca middleware
app.use(seneca.export('web'))

// create a HTTP server using the core Node API
// this lets the admin plugin use web sockets
var server = Http.createServer(app)
server.listen(options.main ? options.main.port : 3000)
