/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_github = require('passport-github')

var GitHubStrategy = passport_github.Strategy


module.exports = function (conf, passport, done) {

  passport.use('github', new GitHubStrategy({
      clientID:       conf.clientID,
      clientSecret:   conf.clientSecret,
      callbackURL:    conf.urlhost + '/auth/github/callback'
    },
    function (accessToken, refreshToken, profile, done) {
      var data = {
        email: profile.emails.length > 0 ? profile.emails[0].value : null,
        nick: profile.username || profile.displayName,
        name: profile.displayName,
        identifier: '' + profile.id,
        credentials: {
          token: accessToken,
          secret: refreshToken},
        userdata: profile,
        when: new Date().toISOString()
      };
      done(null, data);
    }
  ))

  done()
}
