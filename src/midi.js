import WebMidi from 'webmidi'

const maxPos = 24 * 4 * 16;
const fakeBpm = 120;

export class Midi {
  constructor(fakeClock) {
    this.songPos = -1;
    this.bpm = -1;

    this.prevTimestamp = -1;

    this.everyNTicks = [];
    this.everyNLambdas = [];
    this.nextNTicks = [];
    this.nextNLambdas = [];

    WebMidi.enable(() => {
      this.iac = WebMidi.getInputByName("IAC Driver Bus 1");
      this.launchpad = WebMidi.getOutputByName("Launchpad Mini");
      
      if (!this.launchpad) this.launchpad = 
        {playNote: console.log, stopNote: ()=>{}};
      var that = this;
      this.iac.addListener("clock", "all", this.handleClock);

      this.iac.addListener("songposition", "all", (e) => {
        console.log(e)
      });

      this.iac.addListener("stop", "all", (e) => {
        that.songPos = -1;
      });

      this.iac.addListener("start", "all", (e) => {
        that.songPos = -1;
      });

      this.iac.addListener("noteon", "all", (e) => {
        console.log(e.note.number);
        if (e.note.number == 120) that.songPos = -1;
      });

    });
    this.handleClock = this.handleClock.bind(this);

    if (fakeClock) setInterval(() => this.handleClock({}, true), (60000 / fakeBpm) / 24);
  }

  noteNum(coord) {
    if (coord[1] < 4) return 36 + (7 - coord[0]) * 4 + coord[1];
    else return 36 + 32 + (7 - coord[0]) * 4 + (coord[1] - 4);
  }

  lightOn(coords) {
    for (var coord of coords) {
      this.launchpad.playNote(this.noteNum(coord), 1, {velocity: 1});
    }
  }

  lightOff(coords) {
    for (var coord of coords)
      this.launchpad.stopNote(this.noteNum(coord))
  }

  onEvery(ticks, lambda) {
    this.everyNTicks.push(ticks);
    this.everyNLambdas.push(lambda);
    return this.everyNTicks.length - 1;
  }
  removeEvery(index) {
    this.everyNTicks.splice(index, 1);
    this.everyNLambdas.splice(index, 1);
  }

  onNext(ticks, lambda) {
    this.nextNTicks.push(ticks);
    this.nextNLambdas.push(lambda);
  }

  handleClock(e, isFake) {
    var that = this;
    if (isFake) that.bpm = fakeBpm;
    else {
      if (that.prevTimestamp === -1) that.prevTimestamp = e.timestamp;
      else {
        var beatLenMs = (e.timestamp - that.prevTimestamp) * 24;
        that.bpm = Math.round(60000 / beatLenMs);
        that.prevTimestamp = e.timestamp;
      }
    }
    that.songPos += 1;
    if (that.songPos === maxPos) that.songPos = 0;

    for (const [index, beat] of that.everyNTicks.entries()) {
      if ((that.songPos % beat) === 0) that.everyNLambdas[index](that.songPos);
    }

    const indexesToRemove = [];
    for (const [index, beat] of that.nextNTicks.entries()) {
      if ((that.songPos % beat) === 0) {
        that.nextNLambdas[index](that.songPos);
        indexesToRemove.push(index);
      }
    }
    for (const i of indexesToRemove) {
      that.nextNTicks.splice(i, 1);
      that.nextNLambdas.splice(i, 1);
    }
  }
}