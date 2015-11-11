
var passport_local = require('passport-local')

var LocalStrategy = passport_local.Strategy


module.exports = function (conf, passport, done) {
  var seneca = this

  passport.use(new LocalStrategy({passReqToCallback: true},
    function (req, username, password, done) {
      var seneca = req.seneca

      seneca.act({role: 'user', cmd: 'login', nick: username, email: username, password: password}, 
                 function( err, out ){
                   done( !out.ok?out:null, out )
                 })
    }
  ))

  done()
}
