import WebMidi from 'webmidi'

var maxPos = 24 * 4 * 16;

export class Midi {
  constructor() {
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
      this.iac.addListener("clock", "all", (e) => {
        if (that.prevTimestamp === -1) that.prevTimestamp = e.timestamp;
        else {
          var beatLenMs = (e.timestamp - that.prevTimestamp) * 24;
          that.bpm = Math.round(60000 / beatLenMs);
          that.prevTimestamp = e.timestamp;
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

      });

      this.iac.addListener("songposition", "all", (e) => {
        console.log(e)
      });

      this.iac.addListener("stop", "all", (e) => {
        that.songPos = -1;
      });

      this.iac.addListener("start", "all", (e) => {
        that.songPos = -1;
      });

    });
  }

  onEvery(ticks, lambda) {
    this.everyNTicks.push(ticks);
    this.everyNLambdas.push(lambda);
  }

  onNext(ticks, lambda) {
    this.nextNTicks.push(ticks);
    this.nextNLambdas.push(lambda);
  }
}