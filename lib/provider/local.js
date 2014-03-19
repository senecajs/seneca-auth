
var LocalStrategy = require('passport-local').Strategy

module.exports = function (seneca) {

  var authPlugin = new LocalStrategy(
    function (username, password, done) {
      seneca.act({role: 'user', cmd: 'login', nick: username, email: username, password: password},
        function( err, out ) {
          if(err) {
            seneca.log.error(err)
          }
          done( !out.ok ? out : null, out )
        })
    }
  )

  seneca.act({role: 'auth', cmd: 'register_service', service: 'local', plugin: authPlugin, authCallback: null})
}
