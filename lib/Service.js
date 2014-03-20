


function Service(name, conf) {
  this._name = name
  this._conf = conf

}

Service.prototype.name = function() {
  return this._name
}

Service.prototype.conf = function() {
  return this._conf || {}
}

module.exports = Service
