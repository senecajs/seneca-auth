

function Middlewares() {
  this._list = []
}


Middlewares.prototype.use = function(func, ctx) {
  this._list.push({func: func, ctx: ctx})
}

Middlewares.prototype.execute = function() {
  var hasProp = true
  var args = []
  do {
    if(arguments.hasOwnProperty(args.length)) {
      args.push(arguments[args.length])
    } else {
      hasProp = false
    }
  } while(hasProp)

  this._execute(this._list.slice(0), args)
}

Middlewares.prototype._execute = function(list, args) {
  var self = this
  if(list.length > 0) {
    var next = list.shift()

    next.func.apply(next.ctx, args.slice(0, -1).concat(function(err) {
      if(err || list.length === 0) {
        if(args.length > 0) {
          args[args.length-1].apply(null, [err] || args)
        }
      } else {
        self._execute(list, args)
      }
    }))
  } else if(args.length > 0) {
    args[args.length-1].apply(null, args.slice(0, -1))
  }
}

Middlewares.prototype.export = function() {
  var self = this
  return function() {
    self.execute.apply(self, arguments)
  }

}

module.exports = Middlewares
