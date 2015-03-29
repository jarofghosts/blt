# blt

Simplified Apache Storm Bolt creation for node.

## Example

```javascript
var through = require('through2')
  , createBolt = require('blt')

createBolt(splitSentence)

function splitSentence() {
  var splitStream = through(splitWords)

  return splitStream

  function splitWords(data, _, next) {
    data[0].split(' ').forEach(function(word) {
      splitStream.push(word)
    })

    next()
  }
}
```

## API

`blt(createStream)`

* `createStream` is a function that can be called with a tuple object and
  returns a Transform Stream.
* `createStream` will be called for every tuple passed to your Bolt, and
  whatever stream is returned will be anchored to that tuple exclusively.

## Usage

`blt` handles all of the Storm-specific aspects of constructing Bolt streams for
Storm.

* Creates PID file and handshakes with Storm at startup.
* Handles responding to heartbeats.
* When your stream emits, `blt` emits the data packaged up in Storm's tuple
  format with all of the anchoring data needed.
* If your stream emits a "log" event with an argument, `blt` passes it along to
  Storm as a "log" event with `msg`.
* If your stream emits an "error" event, `blt` will "fail" for you.
* When your stream ends, `blt` "ack"s for you.

## Notes

* This is experimental and relatively untested, use at your own risk!

## License

MIT
