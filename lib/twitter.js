
var passport_twitter = require('passport-twitter')
var TwitterStrategy = passport_twitter.Strategy


module.exports = function(conf,userent,useract,passport,done){
  var seneca = this

  passport.use(new TwitterStrategy(
    {
      consumerKey: conf.key,
      consumerSecret: conf.secret,
      callbackURL: conf.urlhost+"/auth/twitter/callback"
    },
    function(token, tokenSecret, profile, done) {
      console.dir(profile)

      userent.load$({nick:profile.username},seneca.err(done,function(user){
        if( !user ) {
          useract.register({nick:profile.username, password:''+Math.random()},seneca.err(done,function(user){
            console.log('reg:'+user)
            done(null,user)
          }))
        }
        else {
          console.log('found:'+user)
          done(null,user)
        }
      }))
    }
  ))


  done()
}
