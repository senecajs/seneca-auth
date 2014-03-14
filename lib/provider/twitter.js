var passport_twitter = require('passport-twitter')

var TwitterStrategy = passport_twitter.Strategy


module.exports = function (conf, passport, done) {

  passport.use('twitter', new TwitterStrategy({
      consumerKey:      conf.key,
      consumerSecret:   conf.secret,
      callbackURL:      conf.urlhost + "/auth/twitter/callback"
    },
    function (token, tokenSecret, profile, done) {
      var data = {
        nick: profile.username,
        name: profile.displayName,
        identifier: '' + profile.id,
        credentials: {token: token, secret: tokenSecret},
        userdata: profile,
        when: new Date().toISOString()
      };
      done(null, data);
    }
  ))

  done()
}
