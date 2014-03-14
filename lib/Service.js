
var gex      = require('gex')
var buffer   = require('buffer')
var connect  = require('connect')
var dispatch = require('dispatch')

var HttpCode = require('./HttpCode.js')


function Service(service, conf, plugin, seneca) {
  this._conf = conf
  this._seneca = seneca
  this._plugin = plugin
  this._service = service

  var self = this;

  var exclude_url = checkUrl(conf.exclude)
  var include_url = checkUrl(conf.include)
  var content_url = checkUrl(conf.content)

  var pp_auth = {}

  var conf = _.extend({}, conf.authconf || {})
  var func = null

}

Service.prototype.conf = function() {
  return this._conf
}

module.export = Service
