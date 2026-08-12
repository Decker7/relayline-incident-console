import { describe, expect, it, vi } from "vitest";
import {
  addEvent,
  advanceStatus,
  buildStakeholderUpdate,
  createIncident,
  incidentToMarkdown,
  parseIncident,
  sampleIncident,
} from "./incident";

describe("incident lifecycle", () => {
  it("creates a usable incident record", () => {
    vi.setSystemTime(new Date("2026-08-12T14:00:00Z"));
    const incident = createIncident({
      title: " API errors ",
      severity: "SEV-2",
      affectedService: "Gateway",
      objective: "Stabilize requests",
    });
    expect(incident.title).toBe("API errors");
    expect(incident.status).toBe("investigating");
    expect(incident.events).toHaveLength(1);
    vi.useRealTimers();
  });

  it("guards forward-only status transitions", () => {
    expect(() => advanceStatus(sampleIncident, "resolved")).toThrow(
      "each response stage",
    );
    expect(() => advanceStatus(sampleIncident, "investigating")).toThrow(
      "cannot move backward",
    );
  });

  it("adds structured timeline events", () => {
    const updated = addEvent(sampleIncident, {
      kind: "decision",
      text: "  Keep traffic shifted.  ",
      owner: "Nadia",
    });
    expect(updated.events.at(-1)?.text).toBe("Keep traffic shifted.");
  });

  it("builds portable stakeholder and markdown exports", () => {
    expect(buildStakeholderUpdate(sampleIncident)).toContain(
      "Next update: in 20 minutes",
    );
    expect(incidentToMarkdown(sampleIncident)).toContain("## Timeline");
  });

  it("rejects incomplete imports", () => {
    expect(() => parseIncident({ title: "Missing fields" })).toThrow(
      "missing required fields",
    );
  });
});
