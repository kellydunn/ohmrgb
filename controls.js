var midi = require("./midi.js");

exports.CROSSFADER = 24;
exports.LEFT_PLAY = 64;
exports.RIGHT_PLAY = 72;

exports.SYSEX_PREFIX = [ 0xF0, 0x00, 0x01, 0x61, 0x07 ];
exports.SYSEX_SUFFIX = 0xF7;

exports.callbacks = {};
exports.lightingLookup = {};

// This will register a callback to be executed
// when the control of the passed in midiControlCode
// is actuated.
//
// Note: midiControlCode is a 16-bit integer
//       the represents the message code + the corresponding
//       OhmRGB MIDI Component ID
exports.registerCallback = function(midiControlCode, f) {
    exports.callbacks[midiControlCode] = f;
};

/*
Note: This formula is slightly complex
      due to the fact that the mutation of ids
      is not very well related to its midicounterpart.

      The basic translation formula appears
      to be the following:
        - Determine if midiButtonID is odd or even.
        - if odd,
          - subtract 63 from its column position * 8
            and subtract that by 3 subtracted by
            its current position in odd interleaving order.
        - if even,
          - subtract 63 from its column position * 8
            and subtract that by 8 subtraced by
            its current position in even interleaving order.
      
      Below are some charts of the respective matricies:

MIDI OhmRGB matrix:
0 8  16 24 32 40 48 56
1 9  17 25 33 41 49 57
2 10 18 26 34 42 50 58
3 11 19 27 35 43 51 59
4 12 20 28 36 44 52 60
5 13 21 29 37 45 53 61
6 14 22 30 38 46 54 62
7 15 23 31 39 47 55 63

Sysex OhmRGB matrix:
56 48 40 32 24 16 8  0
60 52 44 36 28 20 12 4
57 49 41 33 25 17 9  1
61 53 45 37 29 21 13 5
58 50 42 34 26 18 10 2
62 54 46 38 30 22 14 6
59 51 43 35 27 19 11 3
63 55 47 39 31 23 15 7
*/
exports.sysexButtonID = function(midiButtonID) {
    // First check to see if the button ID
    // is in the grid, then apply grid formula.
    if(midiButtonID < 64) {
        
        var column = midiButton / 8;
        var row  = midiButton % 8;        
        var polarity = midiButton % 2;
        
        if(polarity == 1) {
            return (63 - (column * 8) - (3 - (row/2)));
        } else {
            return (63 - (column * 8) - (8 - (row/2)));
        }
    }
    
    return 0;
}

exports.gridID = function(row, column) {
    return row + (8 * column);
}

exports.controlID = function(ohmrgbID, midiType) {
    return midiType << 8 | ohmrgbID;
}

exports.RGBPayload = function(controlCode, color) {
    // Shift even numbers three bits to the left
    // as the last three bits are for the oddly named buttons.
    if(controlCode % 2 == 0) {
        color = color << 3
    }

    return color
}

exports.CROSSFADER_CONTROL_CODE = exports.controlID(
    exports.CROSSFADER,
    midi.CC
);

exports.LEFT_PLAY_CONTROL_CODE = exports.controlID(
    exports.LEFT_PLAY,
    midi.NOTE
);

exports.RIGHT_PLAY_CONTROL_CODE = exports.controlID(
    exports.RIGHT_PLAY,
    midi.NOTE
);

exports.MIDIMessageEventHandler = function(event) {
    if(event.data[0] == midi.CC || (event.data[0] == midi.NOTE & event.data[2] == midi.BUTTON_DOWN)) {
        var controlCode = exports.controlID(event.data[1], event.data[0]);
        exports.callbacks[controlCode](event);
    }
}

// Currently only draws the grid, need to abstract it for other components.
exports.drawSysexMessage = function() {
    var msg = new Int8Array(exports.SYSEX_PREFIX + 44);
    var index = 0;
    
    for(index < exports.SYSEX_PREFIX; index++) {
        msg[index] = exports.SYSEX_PREFIX[index];
    }
    
    msg[index] = 0x04; // Set all LEDs message

    // message length is 42 bytes long,
    // interleaving buttons between each byte
    // first, determine the state of each button in the grid.
    for(var i = 0; i < 64; i+=2) {
        var midiButton = exports.gridID(Math.floor(i / 8), i % 8);
        var control = exports.controlID(midiButton, midi.NOTE);
        var first = exports.lightingLookup[control];

        var midiButton2 = exports.gridID(Math.floor((i+1) / 8), (i+1) % 8);        
        var control2 = exports.controlID(midiButton2, midi.NOTE);
        var second = exports.lightingLookup[control2];

        var payload = exports.RGBPayload(control, first) | exports.RGBPayload(control2, second);
        msg[index] = payload
        index++
    }

    // Remaining 10 bytes for other controls.
    for(var i = 0; i < 10; i++) {
        msg[index] = 0x00;
        index++
    }
    
    msg[index] = SYSEX_SUFFIX;
    return msg;
}
