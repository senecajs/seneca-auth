
function Server(seneca) {


  var http = require('http')

  var express = require('express')

  // use the user and auth plugins
  // the user plugin gives you user account business logic
  seneca.use('user')

  // the auth plugin handles HTTP authentication
  seneca.use(require('../../lib/auth.js'),{
    // redirects after login are needed for traditional multi-page web apps
    redirect:{
      login:{win:'/account',fail:'/login#failed'},
      register:{win:'/account',fail:'/#failed'},
    }
  })



  this._conf = {
    port: 3000
  }


  // use the express module in the normal way
  var app = express()
  app.enable('trust proxy')

  app.use(express.cookieParser())
  app.use(express.query())
  app.use(express.bodyParser())
  app.use(express.json())

  app.use(express.session({secret:'seneca'}))


  // add any middleware provided by seneca plugins


  app.use( seneca.export('web') )


  // when rendering the account page, use the req.seneca.user object
  // to get user details. This is automatically set up by the auth plugin
  app.get('/account', function(req, res){
    res.render('account.ejs',{locals:{user:req.seneca.user}})
  })

  // create some test accounts
  // the "pin" creates a more convenient api, avoiding the need for
  // a full action specification: seneca.act( {role:'user', cmd:'register', ... } )
  var u = seneca.pin({role:'user',cmd:'*'})
  u.register({nick:'u1',name:'nu1',email:'u1@example.com',password:'u1',active:true})
  u.register({nick:'a1',name:'na1',email:'a1@example.com',password:'a1',active:true,admin:true})


  // create a HTTP server using the core Node API
  // this lets the admin plugin use web sockets
  this._server = http.createServer(app)

  seneca.use('data-editor')
  seneca.use('admin', {server: this._server})
}

Server.prototype.start = function(callback) {
  var self = this
  this._server.listen(this._conf.port, function() {
    console.log('listening on port', self._conf.port)
    callback()
  })
}

Server.prototype.stop = function(callback) {
  this._server.close(callback)
}

module.exports = Server
