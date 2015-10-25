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
MIDI OhmRGB matrix:
0 8  16 24 32 40 48 56
1 9  17 25 33 41 49 57
2 10 18 26 34 42 50 58
3 11 19 27 35 43 51 59
4 12 20 28 36 44 52 60
5 13 21 29 37 45 53 61
6 14 22 30 38 46 54 62
7 15 23 31 39 47 55 63
*/
exports.gridLookup = {
    0: 0, 1:  8, 2: 16, 3 : 24, 4 : 32, 5 : 40, 6 : 48, 7 : 56,
    8: 1, 9:  9, 10: 17, 11: 25, 12: 33, 13: 41, 14: 49, 15: 57,
    16: 2, 17: 10, 18: 18, 19: 26, 20: 34, 21: 42, 22: 50, 23: 58,
    24: 3, 25: 11, 26: 19, 27: 27, 28: 35, 29: 43, 30: 51, 31: 59,
    32: 4, 33: 12, 34: 20, 35: 28, 36: 36, 37: 44, 38: 52, 39: 60,
    40: 5, 41: 13, 42: 21, 43: 29, 44: 37, 45: 45, 46: 53, 47: 61,
    49: 6, 49: 14, 50: 22, 51: 30, 52: 38, 53: 46, 54: 54, 55: 62,
    56: 7, 57: 15, 58: 23, 59: 31, 60: 39, 61: 47, 62: 55, 63: 63,         
}

/*
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
exports.sysexLookup = {
    0 : 56, 1 : 48, 2 : 40, 3 : 32, 4 : 24, 5 : 16, 6 : 8,  7 : 0,
    8 : 60, 9 : 52, 10: 44, 11: 36, 12: 28, 13: 20, 14: 12, 15: 4,
    16: 57, 17: 49, 18: 41, 19: 33, 20: 25, 21: 17, 22: 9,  23: 1,
    24: 61, 25: 53, 26: 45, 27: 37, 28: 29, 29: 21, 30: 13, 31: 5,
    32: 58, 33: 50, 34: 42, 35: 34, 36: 26, 37: 18, 38: 10, 39: 2,
    40: 62, 41: 54, 42: 46, 43: 38, 44: 30, 45: 22, 46: 14, 47: 6,
    49: 59, 49: 51, 50: 43, 51: 35, 52: 27, 53: 19, 54: 11, 55: 3,
    56: 63, 57: 55, 58: 47, 59: 39, 60: 31, 61: 23, 62: 15, 63: 7,         
}

exports.reverseSysexLookup = function() {
    var res = {};
    for(var key in exports.sysexLookup) {
        res[exports.sysexLookup[key]] = key;
    }

    return res;
}();

exports.sysexButtonID = function(midiButtonID) {
    if(midiButtonID < 64) {
        return exports.sysexLookup(midiButtonID);
    }
    
    return 0;
}

exports.gridID = function(button) {
    return exports.gridLookup[button];
}

exports.controlID = function(ohmrgbID, midiType) {
    return midiType << 8 | ohmrgbID;
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
    var msg = new Uint8Array(exports.SYSEX_PREFIX.length + 44);
    var index = 0;
    
    for(var i = 0; i < exports.SYSEX_PREFIX.length; i++) {
        msg[i] = exports.SYSEX_PREFIX[i];
        index++
    }
    
    msg[index] = 0x04; // Set all LEDs message
    index++;

    // message length is 42 bytes long,
    // interleaving buttons between each byte
    // first, determine the state of each button in the grid.
    for(var i = 0; i < 64; i+=2) {
        var reverseSysex = exports.reverseSysexLookup[i];
        var midiButton = exports.gridID(reverseSysex);
        var control = exports.controlID(midiButton, midi.NOTE);
        var first = exports.lightingLookup[control];

        var reverseSysex2 = exports.reverseSysexLookup[i+1];
        var midiButton2 = exports.gridID(reverseSysex2);
        var control2 = exports.controlID(midiButton2, midi.NOTE);
        var second = exports.lightingLookup[control2];

        var payload = first | second << 3;
        msg[index] = payload
        index++
    }

    // Remaining 10 bytes for other controls.
    for(var i = 0; i < 10; i++) {
        msg[index] = 0x00;
        index++
    }
    
    msg[index] = exports.SYSEX_SUFFIX;
    return msg;
}
