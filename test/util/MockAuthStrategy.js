
var LocalStrategy = require('passport-local').Strategy


function MockAuthStrategy(validUsers) {
  this._validUsers = validUsers || {}
}

MockAuthStrategy.prototype.mock = function(serviceName, seneca) {
  var self = this
  var authPlugin = new LocalStrategy(
    function (username, password, done) {
      console.log('MOCK', username, password)
      if(self._validUsers.hasOwnProperty(username) && self._validUsers[username] === password) {
        done(undefined, {
          identifier: username,
          username: username
        })
      } else if(self._validUsers.hasOwnProperty(username)) {
        done(new Error('unknown username'), undefined)
      } else {
        done(new Error('invalid password'), undefined)
      }

    }
  )

  seneca.act({role: 'auth', cmd: 'register_service', service: serviceName, plugin: authPlugin})
}

module.exports = MockAuthStrategy
