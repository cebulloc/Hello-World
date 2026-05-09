import { describe, expect, it } from "vitest";
import { scaleNotes } from "./scales";
import { fretNote, findPositions } from "./fretboard";
import { intervalBySemitones } from "./intervals";

describe("theory engine", () => {
  it("produces A minor pentatonic correctly", () => {
    const notes = scaleNotes("A", "minor_pentatonic").map((n) => n.name);
    expect(notes).toEqual(["A", "C", "D", "E", "G"]);
  });

  it("produces C major correctly", () => {
    const notes = scaleNotes("C", "major").map((n) => n.name);
    expect(notes).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("knows the open low E in standard tuning", () => {
    const note = fretNote("standard", 0, 0);
    expect(note.noteName).toBe("E");
    expect(note.midi).toBe(40);
  });

  it("finds A on every string", () => {
    const positions = findPositions("standard", [9], 12);
    expect(positions.length).toBeGreaterThan(5);
    expect(positions.every((p) => p.noteName === "A")).toBe(true);
  });

  it("names the perfect fifth", () => {
    expect(intervalBySemitones(7)?.short).toBe("P5");
  });
});
