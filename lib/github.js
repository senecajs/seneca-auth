/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_github = require('passport-github')

var GitHubStrategy = passport_github.Strategy


module.exports = function (conf, passport, done) {
  var seneca = this;

  passport.use('github', new GitHubStrategy({
      clientID:conf.clientID,
      clientSecret:conf.clientSecret,
      callbackURL:conf.urlhost + '/auth/github/callback'
    },
    function (accessToken, refreshToken, profile, done) {
      seneca.act('role:auth, trigger:service-login, service:github', {
          email:profile.emails.length > 0 ? profile.emails[0].value : null,
          nick:profile.username || profile.displayName,
          name:profile.displayName,
          identifier:'' + profile.id,
          credentials:{token:accessToken, secret:refreshToken},
          userdata:profile,
          when:new Date().toISOString()
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
