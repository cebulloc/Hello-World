import { describe, expect, it } from "vitest";
import { suggestForProgression } from "./jamCoachService.js";

describe("jamCoachService", () => {
  it("identifies A minor for Am G F E", () => {
    const result = suggestForProgression(["Am", "G", "F", "E"]);
    expect(result).not.toBeNull();
    expect(result!.key).toBe("A minor");
    expect(result!.scales[0]!.name).toContain("A");
  });

  it("identifies G major for G C D Em", () => {
    const result = suggestForProgression(["G", "C", "D", "Em"]);
    expect(result!.key).toBe("G major");
  });

  it("returns null on garbage", () => {
    const result = suggestForProgression(["???"]);
    expect(result).toBeNull();
  });
});
