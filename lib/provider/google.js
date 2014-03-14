/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_google_oauth = require('passport-google-oauth')

var GoogleStrategy = passport_google_oauth.OAuth2Strategy


module.exports = function (conf, passport, done) {

  passport.use('google', new GoogleStrategy({
      clientID:       conf.clientID,
      clientSecret:   conf.clientSecret,
      callbackURL:    conf.urlhost + '/auth/google/callback',
      scope:          ['https://www.googleapis.com/auth/userinfo.profile', ' https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/analytics.readonly']
    },
    function (accessToken, refreshToken, params, profile, done) {
      var data = {
        email: profile.emails.length > 0 ? profile.emails[0].value : null,
        nick: profile.displayName,
        name: profile.displayName,
        identifier: '' + profile.id,
        credentials: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: params.expires_in
        },
        userdata: profile,
        when: new Date().toISOString()
      };
      done(null, data);
    }
  ));

  done();
}
