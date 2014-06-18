
var Server            = require('./Server.js')
var MockAuthStrategy  = require('./MockAuthStrategy.js')

var assert  = require('assert')
var request = require('request')
var seneca  = require('seneca')()

var mockStrategy = new MockAuthStrategy({'foo': 'bar'})

var server = new Server(seneca)

server.start(function() {
})

setTimeout(function() {

  mockStrategy.mock('foo', seneca)
}, 1000)
