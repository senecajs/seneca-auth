/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_linkedin = require('passport-linkedin')

var LinkedinStrategy = passport_linkedin.Strategy


module.exports = function (conf, passport, done) {

  passport.use('linkedin', new LinkedinStrategy({
      consumerKey:      conf.key,
      consumerSecret:   conf.secret,
      callbackURL:      conf.urlhost + '/auth/linkedin/callback',
      profileFields:    ['id', 'first-name', 'last-name', 'email-address', 'headline']
    },
    function (token, tokenSecret, profile, done) {
      var data = {
        nick: profile.displayName,
        name: profile.displayName,
        identifier: '' + profile.id,
        credentials: {
          token: token,
          secret: tokenSecret},
        userdata: profile,
        when: new Date().toISOString()
      };
      done(null, data);
    }
  ))

  done()
}
