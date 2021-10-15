'use strict';
/**
* @module edl-composer
*
* @author Pietro Passarelli
* @description  file ELD composer to create Edit Decision List. EDL, Edit Decision List, is a plain text format that describes a video sequence. It can be opened in a video editing software to reconnect media to assemble a video sequence.
* [Apple EDL spec]{@link https://documentation.apple.com/en/finalcutpro/usermanual/index.html#chapter=96%26section=1%26tasks=true  {@link https://documentation.apple.com/en/finalcutpro/usermanual/index.html#chapter=96%26section=1%26tasks=true  }
*
* >"In an EDL, each clip in your sequence is represented by a line of text called an event, which has a unique event number. A clip in an EDL is defined by a source reel name and two pairs of timecode In and Out points. The first pair of timecode numbers describes the source tape (or clip) In and Out points. The second pair describes the timecode location where that clip should be placed onto a master tape (or Timeline)."
*
* The EDL class here represents the EDL as an Object. That can take in a json sequence to generate a string conforming to the specs described above.
* Example usage, takes in a sequence. and `.compose()` is ued to generate the EDL.
@example <caption>Example Usage</caption>
var fs = require("fs");

//given a EDL sequence as json
var edlSqDemo = {
    "title": "Demo Title of project",
    //offset is optional default is "00:00:00:00"
    "events":  [
      { "id":1,
        "startTime": 10,
        "endTime": 20,
        "reelName":"SomeReelName",
        "clipName":"Something.mov"
        "offset": "00:00:28:08",
        "fps": 25
      },
      { "id":2,
        "startTime": 45,
        "endTime": 55,
        "reelName":"SomeOtherReelName",
        "clipName":"SomethingElse.mov",
        "offset": "00:00:28:08",
        "fps": 29.97
      },
        { "id":2,
        "startTime": 45,
        "endTime": 55,
        "reelName":"NA",
        "clipName":"SomethingElse.mov"
        "offset": "00:00:28:08",
        "fps": 24
      }
    ]
}
//instantiate edl object
var edl = new EDL(edlSqDemo)

// create content of EDL file
console.log(edl.compose())
// or write conte of edl to edl file
fs.writeFileSync("edl_example.edl", edl.compose(), 'utf8');

* @example <caption>Example EDL</caption>
TITLE: TEST PAPEREDIT
FCM: NON-DROP FRAME

001  SomeRee AA/V  C        00:02:26:21 00:02:30:12 00:00:00:00 00:00:03:16
* FROM CLIP NAME:  Something.mov
* COMMENT:
FINAL CUT PRO REEL: SomeReelName REPLACED BY: SomeRee

002  SomeOthe AA/V  C        00:02:30:12 00:02:34:13 00:00:03:16 00:00:07:17
* FROM CLIP NAME:  SomethingElse.mov
* COMMENT:
FINAL CUT PRO REEL: SomeOtherReelName REPLACED BY: SomeOthe

003  AX AA/V  C        00:02:30:12 00:02:34:13 00:00:03:16 00:00:07:17
* FROM CLIP NAME:  SomethingElse.mov
* COMMENT:

* @tutorial EDL_format
* @todo Write documentation.
* @todo add error handling and error callbacks
*/
import path from 'path';
import {
  secondsToTimecode,
  timecodeToSeconds,
  shortTimecode
} from "@pietrop/timecode-converter";


/**
* Represents an EDL Object.
* @constructor
* @param {Object} config - EDL video sequence as JSON
* @param {string} config.title - Title of the EDL video sequence

* @param {Object[]} config.events - array of video segment makind up the EDL sequence
* @param {string} config.events[].id - "id" of video segment
* @param {number} config.events[].startTime - start time of video segment in seconds
* @param {number} config.events[].endTime - end time of video segment in seconds
* @param {string} config.events[].reelName - reel name of video segment, generally the name of the card the footage was filmed on or not available
* @param {string} config.events[].clipName - file name that the video segment belongs to. Only file name. no path.
* @param {string} config.events[].offset - The camera timecode, eg free run, rec run, time of day, repsent a time offset from the time relative to the beginning of the video file timeline. in format of timecode eg "00:00:28:08" such as "hh:mm:ss:ms" because that's how cameras write it in the metadata of the file. if it is  "NA" then it uses default 0.
* @returns {stirng} EDL - and EDL string that can written to file to import EDL into video editing software.
*/
var EDL = function(config) {
  let counter = 0;
  // creating head of EDL with project title.
  this.head = 'TITLE: ' + config.title + '\nFCM: NON-DROP FRAME\n\n';
  // by default setting offset to zero, equivalent to as if it was "00:00:00:00"
  // this.offset = 0;
  // if offset exists

  // creating body of the EDL
  this.body = function() {
    // startime relative to EDL sequence always starts from zero, equivvalent to "00:00:00:00"
    var startTimecode = 0 ;
    // story EDL sequence segments in array
    var edlBody = [];
    // iterate over sequence events segments to make the edl body
    for (var j = 0; j < config.events.length; j++) {
      var event =  config.events[j];
      // creating EDL Lines, startTimecode passed as second param so that it can increment for every line
      var edlLine = new EDLline(event, startTimecode);
    
      // set startTimecode to increment for next line by keeping value of current.
      startTimecode = edlLine.tapeOut();
      // transform segment into string
      if( path.extname(event.clipName.toLocaleLowerCase()) === '.mxf' ){
        edlBody.push(edlLine.composeMXFline());
      }else{
        edlBody.push(edlLine.compose());
      }
    }
    return edlBody.join('');
  };
  // putting the EDL togethere by joining head and body
  this.compose = function() {
    return this.head + this.body();
  };


  /**
  * @constructor
  * @description Represents an EDL Line for the EDL body.
  * @param {Object[]} config.events - array of video segment makind up the EDL sequence
  * @param {string} config.events[].id - "id" of video segment
  * @param {number} config.events[].startTime - start time of video segment in seconds
  * @param {number} config.events[].endTime - end time of video segment in seconds
  * @param {string} config.events[].reelName - reel name of video segment, generally the name of the card the footage was filmed on or not available
  * @param {string} config.events[].clipName - file name that the video segment belongs to. Only file name. no path.
  * @param {string} config.events[].offet - Camera timecode offset. 
  * @function {string} EDL - and EDL string  for an EDL line.
  */
  var EDLline = function(event, tapeIn) {
  //making fps option to keep bakcward compatibility,
  //default as PAL 25 fps
    if(event.fps){
      //to keep backward compatibility with 1/50 motation. in that caseset as default PAL.
      if(typeof event.fps == "string" ){
        this.fps = 25;
      }else{
          this.fps = parseFloat(event.fps).toFixed( 2 );
      }
    }else{
      this.fps = 25;
    }
    
    if (event.offset != 'NA') {
      // converting offset to seconds
      // if event.offset is not defined.
      // TODO: make offset optional 
      if(event.offset){
        this.offset = timecodeToSeconds(event.offset ,this.fps);
      }else{
        this.offset = 0 ;
      }
    }else{
      this.offset = 0;
    }

    this.n = function() {
      counter+=1;
      //TODO FIX THIS it says it's undefined!!!!! coz event.it doesn't have a number. 
      // if undefined should make it's own counter. c
      // return this.counter; 
      if (counter.toString().length == 1) {
        return '00' + counter.toString();
      } else if (counter.toString().length == 2) {
        return '0' + counter.toString();
      } else if (counter.toString().length == 3) {
        return counter.toString();
      } else {
        return counter.toString();
      }
    };

    // this.returnCounter = function() {
    //   return counter;
    // };


    this.startTime = event.startTime;
    this.endTime = event.endTime;

    this.clipInPoint = function() {
      // return convert  this.endTime to TC
      return this.startTime ;
      // return parseFloat(this.startTime) ;
    };
    this.clipOutPoint = function() {
      // return convert  this.endTime to TC
      return  this.endTime;
      // return  parseFloat(this.endTime);
    };

    this.reelName = event.reelName;
    this.reelName7digit = function() {
      //EDL does not handle spaces so also removing spaces.
      //EDL only handles uppercar case and numbers A-Z 0-9 
      //TODO: it be good to have a chat for illegal char and to replace/remove. 
      return this.reelName.replace(/ /g, "").split('').slice(0,7).join('').toUpperCase();
    };

    this.clipName = event.clipName;

    this.tapeIn = tapeIn;

    this.tapeOut = function() {
      var result = (this.tapeIn + (this.clipOutPoint() - this.clipInPoint()));
      return result;
      // return 890;
    };

    this.compose = function() {
      const lineNumber = this.n();
      // console.log('lineNumber ',lineNumber)
      var res = '';
      // Handling lack of reel name in clip.
      if (this.reelName != 'NA') {
        res =  '' + lineNumber + '   ' + this.reelName7digit() + '  AA/V  C  ';
      } else {
        res =  '' + lineNumber + '   ' + ' AX  AA/V  C  ';
      }
      //TODO Figure out why it is giving error with timecode: perhaps console.log the timecodes and see what's
      res += secondsToTimecode(this.clipInPoint() + this.offset, this.fps) + ' ' + secondsToTimecode(this.clipOutPoint() + this.offset,this.fps)+" ";
      res += secondsToTimecode(this.tapeIn,this.fps) + ' ' + secondsToTimecode(this.tapeOut(),this.fps) + '\n';
      // res += this.clipInPoint() + this.offset + ' ' + this.clipOutPoint() + this.offset + ' ';
      // res += this.tapeIn + ' ' + this.tapeOut() + '\n';
      res += '* FROM CLIP NAME: ' + this.clipName + '\n';
      // Handling lack of reel name in clip.
      if (this.reelName != 'NA') {
        res += 'FINAL CUT PRO REEL: ' + this.reelName + ' REPLACED BY: ' + this.reelName7digit() + '\n\n';
      } else {
        res += '\n';
      }
      return res;
    };

    this.composeMXFline = function() {

      // Handling lack of reel name in clip.
      // if (this.reelName != 'NA') {
        // res =  '' + this.n() + '   ' + this.reelName7digit() + '  AA/V  C  ';
      // } else {
      let res =  '' + this.n() + '   ' + ' AX  V  C  ';
        // res+= '\n!!'+  this.offset+'!!\n'
      // }
      //TODO Figure out why it is giving error with timecode: perhaps console.log the timecodes and see what's
      res += secondsToTimecode(this.clipInPoint() + this.offset,this.fps) + ' ' + secondsToTimecode(this.clipOutPoint() + this.offset,this.fps)+" ";
      res += secondsToTimecode(this.tapeIn,this.fps) + ' ' + secondsToTimecode(this.tapeOut(),this.fps) + '\n';
      // res += this.clipInPoint() + this.offset + ' ' + this.clipOutPoint() + this.offset + ' ';
      // res += this.tapeIn + ' ' + this.tapeOut() + '\n';
      res += '* FROM CLIP NAME: ' + this.clipName + '\n';
      res+='\n';
      // AUDIO Track 1
      res +=  '' + this.n() + '   ' + ' AX  AA  C  ';
      res += secondsToTimecode(this.clipInPoint() + this.offset,this.fps) + ' ' + secondsToTimecode(this.clipOutPoint() + this.offset,this.fps)+" ";
      res += secondsToTimecode(this.tapeIn,this.fps) + ' ' + secondsToTimecode(this.tapeOut(),this.fps) + '\n';
      res += '* FROM CLIP NAME: ' + this.clipName + '\n';
      // res +=`* AUDIO LEVEL AT 00:38:43:04 IS -8.98 DB  (REEL AX A1)`;
      res +=`* AUDIO LEVEL AT ${secondsToTimecode(this.clipInPoint() + this.offset,this.fps)} IS -8.98 DB  (REEL AX A1)\n`;
      res +=`* AUDIO LEVEL AT ${secondsToTimecode(this.clipInPoint() + this.offset,this.fps)} IS -8.98 DB  (REEL AX A2)\n`;
      res+='\n';

      // Audio track 2
      res +=  '' + this.n() + '  AX       NONE  C        ';
      res += secondsToTimecode(this.clipInPoint() + this.offset,this.fps) + ' ' + secondsToTimecode(this.clipOutPoint() + this.offset,this.fps)+" ";
      res += secondsToTimecode(this.tapeIn,this.fps) + ' ' + secondsToTimecode(this.tapeOut(),this.fps) + '\n';
      res += '* FROM CLIP NAME: ' + this.clipName + '\n';
      // res +=`* AUDIO LEVEL AT 00:38:43:04 IS -8.98 DB  (REEL AX A1)`;
      res +=`* AUDIO LEVEL AT ${secondsToTimecode(this.clipInPoint() + this.offset,this.fps)} IS -8.98 DB  (REEL AX A3)\n`;
      res +=`* AUDIO LEVEL AT ${secondsToTimecode(this.clipInPoint() + this.offset,this.fps)} IS -8.98 DB  (REEL AX A4)\n`;
      res +="AUD  3    4"
      res+='\n\n';
      return res;
    };
  };

};

export default EDL;
// module.exports = EDL;
