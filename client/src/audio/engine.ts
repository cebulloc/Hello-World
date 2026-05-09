import * as Tone from "tone";

let synth: Tone.PolySynth | null = null;
let started = false;

async function ensure() {
  if (!started) {
    await Tone.start();
    started = true;
  }
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.005,
        decay: 0.4,
        sustain: 0.2,
        release: 0.7,
      },
      volume: -8,
    }).toDestination();
  }
}

export async function playNote(pitch: string, durationSec = 0.6) {
  try {
    await ensure();
    synth!.triggerAttackRelease(pitch, durationSec);
  } catch (e) {
    console.warn("playNote failed", e);
  }
}

export async function playNotes(pitches: string[], durationSec = 1) {
  try {
    await ensure();
    synth!.triggerAttackRelease(pitches, durationSec);
  } catch (e) {
    console.warn("playNotes failed", e);
  }
}

export async function playSequence(
  pitches: string[],
  tempo = 90,
  noteValue: "8n" | "16n" | "4n" = "8n",
) {
  try {
    await ensure();
    const stepSec = (60 / tempo) * (noteValue === "16n" ? 0.25 : noteValue === "8n" ? 0.5 : 1);
    const now = Tone.now();
    pitches.forEach((p, i) => {
      synth!.triggerAttackRelease(p, stepSec * 0.9, now + i * stepSec);
    });
  } catch (e) {
    console.warn("playSequence failed", e);
  }
}

export async function setMasterVolume(db: number) {
  await ensure();
  Tone.getDestination().volume.rampTo(db, 0.1);
}
