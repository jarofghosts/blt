var path = require('path')
var fs = require('fs')

var stormStream = require('storm-stream')
var through = require('through2')
var arrify = require('arrify')
var touch = require('touch')

var thisProcess = require('./lib/process')

var PID = thisProcess.pid

module.exports = stormBolt

function stormBolt (createStream, _opts) {
  var opts = _opts || {anchored: false}
  var storm = stormStream()
  var blt = through.obj()
  var pidFile
  var stream

  blt.pipe(storm)

  storm.once('data', setup)

  return blt

  function setup (data) {
    pidFile = path.join(data.pidDir, PID.toString())

    touch.sync(pidFile)

    thisProcess.on('exit', function () {
      fs.unlinkSync(pidFile)
    })

    blt.write({pid: PID})

    stream = createStream(data)

    stream.on('log', onLog)
    stream.on('data', onData)
    stream.on('fail', onFail)
    stream.on('ack', onAck)

    storm.on('data', processTuple)

    function onLog (message) {
      blt.write(log(message))
    }

    function onData (arr) {
      if (opts.anchored && Array.isArray(arr)) {
        blt.write(emit(arr[0], arr[1]))
      } else {
        blt.write(emit(arr))
      }
    }

    function onFail (tuple) {
      blt.write(fail(tuple.id))
    }

    function onAck (tuple) {
      blt.write(ack(tuple.id))
    }
  }

  function processTuple (tuple) {
    if (tuple.stream && tuple.stream === '__heartbeat') {
      return blt.write({command: 'sync'})
    }

    if (Array.isArray(tuple)) {
      return blt.emit('taskIds', tuple)
    }

    stream.write(tuple)
  }
}

function log (data) {
  return {command: 'log', msg: data}
}

function emit (data, tuple) {
  var result = {command: 'emit', tuple: arrify(data)}

  if (tuple) {
    result.anchors = arrify(tuple).map(function (t) {
      return t.id
    })
  }

  return result
}

function ack (id) {
  return {command: 'ack', id: id}
}

function fail (id) {
  return {command: 'fail', id: id}
}
