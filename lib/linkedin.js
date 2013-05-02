/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_linkedin = require('passport-linkedin')

var LinkedinStrategy = passport_linkedin.Strategy


module.exports = function (conf, passport, done) {
  var seneca = this;

  passport.use('linkedin', new LinkedinStrategy({
      consumerKey:     conf.key,
      consumerSecret:  conf.secret,
      callbackURL:     conf.urlhost + '/auth/linkedin/callback',
      profileFields:   ['id', 'first-name', 'last-name', 'email-address', 'headline']
    },
    function (token, tokenSecret, profile, done) {
      seneca.act('role:auth, trigger:service-login, service:linkedin', {
          nick:         profile.displayName,
          name:         profile.displayName,
          identifier:   '' + profile.id,
          credentials:  {token:token, secret:tokenSecret},
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
