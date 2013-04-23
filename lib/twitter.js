

var util = require('util')


var passport_twitter = require('passport-twitter')
var TwitterStrategy = passport_twitter.Strategy


module.exports = function(conf,passport,done){
  var seneca = this

  passport.use(new TwitterStrategy(
    {
      consumerKey: conf.key,
      consumerSecret: conf.secret,
      callbackURL: conf.urlhost+"/auth/twitter/callback"
    },
    function(token, tokenSecret, profile, done) {
      seneca.act(
        'role:auth, trigger:service-login, service:twitter',
        {
          nick:         profile.username,
          name:         profile.displayName,
          identifier:   ''+profile.id,
          credentials:  {token:token,secret:tokenSecret},
          userdata:     profile,
          when:         new Date().toISOString()
        },

        function(err,user) {
          if( err ) return done(err);
          seneca.act({role:'user',cmd:'login',nick:user.nick,auto:true},seneca.err(done,function(out){
            return out.ok ? done(null,out) : done(null,null)
          }))
        }
      )
    }
  ))


  done()
}
