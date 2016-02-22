module.exports = {
  'admin': {
    'local': false
  },

  framework: 'express',
  prefix: '/auth/',

  urlpath: {
    login: 'login',
    logout: 'logout',
    user: 'user',
    register: 'register',
    create_reset: 'create_reset',
    load_reset: 'load_reset',
    execute_reset: 'execute_reset',
    confirm: 'confirm',
    update_user: 'update_user',
    change_password: 'change_password'
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
  }

//  loginpages: [
//    { path: '/login/admin', redirect: '/admin', title: 'Administration' },
//    { path: '/login', redirect: '/account', title: 'Account' }
//  ]
}
