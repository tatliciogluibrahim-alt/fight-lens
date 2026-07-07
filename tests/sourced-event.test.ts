import { describe, it, expect } from "vitest";
// Importing the module also runs assertSourcedEvent() against the real
// data/normalized/events/ufc-328.json at load — so this import throwing would
// itself be a failure signal that the shipped data drifted.
import { assertSourcedEvent, sourcedEvent } from "@/lib/sourced-event";

const LABEL = "test-fixture.json";

function validEvent() {
  return {
    schemaVersion: 1,
    event: { id: "ufc-999", name: "UFC 999: Test vs. Case" },
    fights: [
      { id: "a-b", fighters: { fighterA: { name: "Fighter A" }, fighterB: { name: "Fighter B" } } },
    ],
  };
}

describe("assertSourcedEvent — happy path", () => {
  it("returns the value for a well-formed event", () => {
    const ev = validEvent();
    expect(assertSourcedEvent(ev, LABEL)).toBe(ev);
  });

  it("the shipped ufc-328 event loaded and validated (import did not throw)", () => {
    expect(sourcedEvent.event.id).toBe("ufc-328");
    expect(Array.isArray(sourcedEvent.fights)).toBe(true);
  });
});

describe("assertSourcedEvent — readable failures name the file", () => {
  it("rejects a non-object", () => {
    expect(() => assertSourcedEvent(null, LABEL)).toThrow(LABEL);
    expect(() => assertSourcedEvent("nope", LABEL)).toThrow("expected an object");
  });

  it("rejects a missing event object / id / name", () => {
    expect(() => assertSourcedEvent({ fights: [] }, LABEL)).toThrow('missing "event"');
    const noId = { event: { name: "X" }, fights: [] };
    expect(() => assertSourcedEvent(noId, LABEL)).toThrow('"event.id"');
    const noName = { event: { id: "x" }, fights: [] };
    expect(() => assertSourcedEvent(noName, LABEL)).toThrow('"event.name"');
  });

  it("rejects a non-array fights", () => {
    const bad = { event: { id: "x", name: "X" }, fights: {} };
    expect(() => assertSourcedEvent(bad, LABEL)).toThrow('"fights" must be an array');
  });

  it("rejects a fight missing fighters, naming the index", () => {
    const bad = { event: { id: "x", name: "X" }, fights: [{ id: "z" }] };
    expect(() => assertSourcedEvent(bad, LABEL)).toThrow("fights[0] is missing");
  });

  it("rejects a fighter missing a name, naming the side", () => {
    const bad = {
      event: { id: "x", name: "X" },
      fights: [{ fighters: { fighterA: { name: "OK" }, fighterB: {} } }],
    };
    expect(() => assertSourcedEvent(bad, LABEL)).toThrow("fighterB is missing a name");
  });
});
