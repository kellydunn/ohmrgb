# ohmrgb

A Javascript library that makes working with Livid Instrument's [OhmRGB](http://lividinstruments.com/products/ohm-rgb/) a little bit easier.

## usage

This project uses `npm` to distribute builds.  To get started, you can install the library using the `npm` tool:

```
$ npm install ohmrgb --save
```

Then, in your Javascript files, you can include the module and get to work!

```javascript
var ohmrgb = require("ohmrgb");

// Set up Web MIDI

var cb = function(event) {
    console.log(event);
}

ohmrgb.registerCallback(
  ohmrgb.LEFT_PLAY_CONTROL_CODE,
  cb,
)

midi.onmidiinputevent = ohmrgb.MIDIMessageEventHandler;
```

## features

- MIDI component ID lookup
- MIDI sysex control code lookup
- MIDI callback delegation

## roadmap
- lighting (soon!)
- more docs!
