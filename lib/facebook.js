
var passport_facebook = require('passport-facebook')

var FacebookStrategy = passport_facebook.Strategy


module.exports = function (conf, passport, done) {
  var seneca = this

  passport.use(new FacebookStrategy({
      clientID:       conf.key,
      clientSecret:   conf.secret,
      callbackURL:    conf.urlhost + "/auth/facebook/callback"
    },
    function (accessToken, refreshToken, profile, done) {
      var data = {
        identifier: '' + profile.id,
        credentials: {
          access: accessToken,
          refresh: refreshToken},
        userdata: profile,
        when: new Date().toISOString()
      };
    }
  ))

  done()
}
