var path = require('path')

var through = require('through2')
  , split = require('split')
  , touch = require('touch')

var PID = process.pid

module.exports = stormBolt

function stormBolt(createStream) {
  var input = process.stdin.pipe(split()).pipe(through.obj(deserialize))
    , output = through.obj(serialize)

  output.pipe(process.stdout)

  input.once('data', setup)

  function setup(data) {
    touch.sync(path.join(data.pidDir, PID.toString()))

    output.write({pid: PID})

    input.on('data', processTuple)
  }

  function processTuple(tuple) {
    if(tuple.stream && tuple.stream === '__heartbeat') {
      return output.write({command: 'sync'})
    }

    var stream = createStream(tuple)

    stream.on('log', onLog)
    stream.on('data', onData)
    stream.on('error', onError)
    stream.on('end', onEnd)

    stream.end(tuple.tuple)

    function onLog(data) {
      output.write(log(data))
    }

    function onData(data) {
      output.write(emit(data, tuple.id, tuple.task))
    }

    function onError() {
      output.write(fail(tuple.id))
      finish()
    }

    function onEnd() {
      output.write(ack(tuple.id))
      finish()
    }

    function finish() {
      stream.removeListener('log', onLog)
      stream.removeListener('data', onData)
      stream.removeListener('error', onError)
      stream.removeListener('end', onEnd)
    }
  }
}

function log(data) {
  return {command: 'log', msg: data}
}

function emit(data, id, task) {
  return {
      command: 'emit'
    , tuple: arrayify(data)
    , anchors: arrayify(id)
    , task: task
  }
}

function ack(id) {
  return {command: 'ack', id: id}
}

function fail(id) {
  return {command: 'fail', id: id}
}

function deserialize(buf, x, next) {
  var self = this
    , str = buf.toString()

  if(str === 'end') {
    return next()
  }

  var data = parseJson()

  if(data !== undefined) {
    self.push(data)
  }

  next()

  function parseJson() {
    try {
      return JSON.parse(str)
    } catch(err) {
      self.emit('error', err)
    }
  }
}

function serialize(obj, _, next) {
  this.push(JSON.stringify(obj) + '\nend\n')

  next()
}

function arrayify(data) {
  return Array.isArray(data) ? data : [data]
}
