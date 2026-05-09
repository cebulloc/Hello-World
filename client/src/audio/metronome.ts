import * as Tone from "tone";

interface MetronomeOptions {
  tempo: number;
  onTick?: (beat: number) => void;
}

export class Metronome {
  private loop: Tone.Loop | null = null;
  private synth: Tone.MembraneSynth;
  private accent: Tone.MembraneSynth;
  private beatCounter = 0;
  private opts: MetronomeOptions;

  constructor(opts: MetronomeOptions) {
    this.opts = opts;
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 6,
      volume: -10,
    }).toDestination();
    this.accent = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 8,
      volume: -6,
    }).toDestination();
    Tone.getTransport().bpm.value = opts.tempo;
  }

  setTempo(bpm: number) {
    this.opts.tempo = bpm;
    Tone.getTransport().bpm.rampTo(bpm, 0.1);
  }

  async start() {
    await Tone.start();
    this.beatCounter = 0;
    this.loop = new Tone.Loop((time) => {
      const beat = this.beatCounter % 4;
      if (beat === 0) this.accent.triggerAttackRelease("C5", "16n", time);
      else this.synth.triggerAttackRelease("C4", "16n", time);
      Tone.getDraw().schedule(() => {
        this.opts.onTick?.(beat);
      }, time);
      this.beatCounter++;
    }, "4n").start(0);
    Tone.getTransport().start();
  }

  stop() {
    this.loop?.dispose();
    this.loop = null;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
  }

  dispose() {
    this.stop();
    this.synth.dispose();
    this.accent.dispose();
  }
}
