/* Copyright (c) 2013 Paul Negrutiu, MIT License */

var passport_google = require('passport-google')

var GoogleStrategy = passport_google.Strategy


module.exports = function (conf, passport, done) {
  var seneca = this;

  passport.use(new GoogleStrategy({
      returnURL:conf.urlhost + '/auth/google/callback',
      realm:conf.urlhost
    },
    function (identifier, profile, done) {
      seneca.act('role:auth, trigger:service-login, service:google', {
          identifier:identifier,
          nick:profile.username || profile.displayName,
          email:profile.emails.length > 0 ? profile.emails[0].value : null,
          name:profile.displayName,
          userdata:profile,
          when:new Date().toISOString()
        },
        function (err, user) {
          if (err) return done(err);
          seneca.act({role:'user', cmd:'login', nick:user.nick, auto:true}, seneca.err(done, function (out) {
            return out.ok ? done(null, out) : done(null, null)
          }))
        }
      );
    }
  ));

  done();
}
