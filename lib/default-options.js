module.exports = {

  admin:{local:false},

  tokenkey:'seneca-login', // name of cookie
  transientprefix:'seneca-transient-', // cookie prefix

  service:{local:{}},

  prefix: '/auth',

  urlpath: {
    login:    'login',
    logout:   'logout',
    instance: 'instance',
    register: 'register',
    reset_create:  'reset_create',
    reset_load:    'reset_load',
    reset_execute: 'reset_execute',
  },

  restrict: '/account',

  // urls patterns to ignore (don't bother looking for user)
  exclude: /(\.ico|\.css|\.png|\.jpg|\.gif)$/,

  // urls patterns to process  (always look for user)
  include: [],

  // auth plugin's own content
  content: ['suffix:/login-web.js'],

  sendemail:false,
  email:{
    send:false,
    code:{
      register:'auth-register',
      create_reset:'auth-create-reset'
    },
    subject:{
      register:'Welcome!',
      create_reset:'Password Reset'
    },
    content:{
      resetlinkprefix:'http://127.0.0.1:3333/reset',
      confirmlinkprefix:'http://127.0.0.1:3333/confirm'
    }
  },

  // redirect settings, if redirecting
  redirect:{
    always: false,
    win:'/',
    fail:'/',
    restrict:'/',

    login:         {win:'/account',fail:'/',},
    logout:        {win:'/',fail:'/',},
    register:      {win:'/account',fail:'/',},
    reset_create:  {win:'/',fail:'/',},
    reset_load:    {win:'/',fail:'/',},
    reset_execute: {win:'/',fail:'/',},
    confirm:       {win:'/',fail:'/',},
  },

  // alias:field
  register: {
    fields: {
      name:'name',
      nick:'nick',
      email:'email',
      password:'password',
      repeat:'repeat',

      username:'nick'
      // add your own
    }
  },
  login: {
    fields: {
      username:'nick'
    }
  },

  user: {
    updatefields: ['name','email']
  },


  defaultpages:false,
  loginpages:[
    { path:'/login/admin', redirect:'/admin', title:'Administration' },
    { path:'/login', redirect:'/account', title:'Account' }
  ]

}
