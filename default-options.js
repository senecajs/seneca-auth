module.exports = {
  "admin": {
    "local": false
  },

  "tokenkey": "seneca-login", // name of cookie

  prefix: '/auth',

  urlpath: {
    login: '/login',
    logout: '/logout',
    instance: '/instance',
    register: '/register',
    reset_create: '/reset_create',
    reset_load: '/reset_load',
    reset_execute: '/reset_execute'
  },

  restrict: '/account',

  // urls patterns to ignore (don't bother looking for user)
  exclude: /(\.ico|\.css|\.png|\.jpg|\.gif)$/,

// urls patterns to process  (always look for user)
  include: [],

// auth plugin's own content
  content: ['suffix:/login-web.js'],

// redirect settings, if redirecting
  redirect: {
    always: false,
    win: '/',
    fail: '/',
    restrict: '/',

    login: {win: '/account', fail: '/'},
    logout: {win: '/', fail: '/'},
    register: {win: '/account', fail: '/'},
    reset_create: {win: '/', fail: '/'},
    reset_load: {win: '/', fail: '/'},
    reset_execute: {win: '/', fail: '/'},
    confirm: {win: '/', fail: '/'}
  },

  user: {
    updatefields: ['name', 'email']
  },

  loginpages: [
    { path: '/login/admin', redirect: '/admin', title: 'Administration' },
    { path: '/login', redirect: '/account', title: 'Account' }
  ]

}