/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_google_oauth = require('passport-google-oauth')

var GoogleStrategy = passport_google_oauth.OAuth2Strategy


module.exports = function (conf, passport, done) {
  var seneca = this;

  passport.use('google', new GoogleStrategy({
      clientID:         conf.clientID,
      clientSecret:     conf.clientSecret,
      callbackURL:      conf.urlhost + '/auth/google/callback',
      scope:            ['https://www.googleapis.com/auth/userinfo.profile', ' https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/analytics.readonly']
    },
    function (accessToken, refreshToken, params, profile, done) {
      seneca.act('role:auth, trigger:service-login, service:google', {
          email:        profile.emails.length > 0 ? profile.emails[0].value : null,
          nick:         profile.displayName,
          name:         profile.displayName,
          identifier:   '' + profile.id,
          credentials:  {accessToken: accessToken, refreshToken: refreshToken, expiresIn: params.expires_in},
          userdata:     profile,
          when:new      Date().toISOString()
        },
        function (err, user) {
          if (err) return done(err);
          seneca.act({role:'user', cmd:'login', nick:user.nick, auto:true}, seneca.err(done, function (out) {
            return out.ok ? done(null, out) : done(null, null)
          }))
        }
      )
    }
  ))

  done()
}
