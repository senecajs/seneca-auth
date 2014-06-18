
var Server            = require('./util/Server.js')
var MockAuthStrategy  = require('./util/MockAuthStrategy.js')

var assert  = require('assert')
var request = require('request')
var seneca  = require('seneca')()

// set to true to keep the server running
var DEBUG = false

describe('integration test', function() {

  var mockStrategy = new MockAuthStrategy({'foo': 'bar'})
  var server
  before(function(done) {
    server = new Server(seneca)
    server.start(function() {
      mockStrategy.mock('foo', seneca)
      done()
    })
  })

  after(function(done) {
    if(DEBUG) {
      this.timeout(5*60*1000)
    } else {
      server.stop(done)
    }
  })

  it('login should fail with wrong login', function(done) {
    var r = request.post('http://localhost:3000/auth/login', {data: {username: 'foo', password: 'bar'}}, function (err, httpResponse, body) {
      console.log(httpResponse.statusCode, err, body)
      done(err)
    })
//    var form = r.form()
//    form.append('username', 'foo')
//    form.append('password', 'bar2')

  })

})
