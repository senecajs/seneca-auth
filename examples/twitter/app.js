/* Copyright (c) 2012-2015 Richard Rodger, MIT License */
"use strict";

var http = require('http')

var express        = require('express')
var bodyParser     = require('body-parser')
var cookieParser   = require('cookie-parser')
var methodOverride = require('method-override')
var session        = require('express-session')
var serveStatic    = require('serve-static')

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
seneca.use('twitter-auth', options.twitter)

// use the express module in the normal way
var app = express()
app.enable('trust proxy')

app.use(cookieParser())
app.use(express.query())
app.use(bodyParser.urlencoded({extended: true}))
app.use(methodOverride())
app.use(bodyParser.json())

// Use in-memory sessions so OAuth will work
// In production, use redis or similar
app.use(session({secret:'seneca'}))

app.use(serveStatic(__dirname + '/public'))

// add seneca middleware
app.use( seneca.export('web') )

// create a HTTP server using the core Node API
// this lets the admin plugin use web sockets
var server = http.createServer(app)
server.listen( options.main ? options.main.port : 3000 )
