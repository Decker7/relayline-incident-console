export type Severity = "SEV-1" | "SEV-2" | "SEV-3";
export type IncidentStatus =
  "investigating" | "identified" | "monitoring" | "resolved";
export type EventKind = "update" | "decision" | "action";

export interface IncidentEvent {
  id: string;
  at: string;
  kind: EventKind;
  text: string;
  owner?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  startedAt: string;
  commander: string;
  scribe: string;
  objective: string;
  affectedService: string;
  events: IncidentEvent[];
}

export const statusOrder: IncidentStatus[] = [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
];

export const sampleIncident: Incident = {
  id: "inc-checkout-aug12",
  title: "Checkout authorization latency",
  severity: "SEV-2",
  status: "identified",
  startedAt: "2026-08-12T12:42:00.000Z",
  commander: "Nadia Rahman",
  scribe: "Ethan Lim",
  objective:
    "Restore card authorization latency below the alert threshold without dropping queued payments.",
  affectedService: "Payment gateway",
  events: [
    {
      id: "evt-1",
      at: "2026-08-12T12:42:00.000Z",
      kind: "update",
      text: "Latency alert fired for the authorization endpoint.",
    },
    {
      id: "evt-2",
      at: "2026-08-12T12:49:00.000Z",
      kind: "action",
      text: "Traffic shifted away from the degraded provider route.",
      owner: "Platform",
    },
    {
      id: "evt-3",
      at: "2026-08-12T12:56:00.000Z",
      kind: "decision",
      text: "Hold queued retries until the alternate route is stable.",
      owner: "Nadia Rahman",
    },
    {
      id: "evt-4",
      at: "2026-08-12T13:08:00.000Z",
      kind: "update",
      text: "Authorization p95 is declining; no payment loss observed.",
    },
  ],
};

export function createIncident(
  input: Pick<Incident, "title" | "severity" | "affectedService" | "objective">,
): Incident {
  const title = input.title.trim();
  const service = input.affectedService.trim();
  if (!title) throw new Error("Incident title is required.");
  if (!service) throw new Error("Affected service is required.");
  return {
    id: "inc-" + Date.now().toString(36),
    title,
    severity: input.severity,
    affectedService: service,
    objective:
      input.objective.trim() || "Stabilize the service and establish impact.",
    status: "investigating",
    startedAt: new Date().toISOString(),
    commander: "Unassigned",
    scribe: "Unassigned",
    events: [
      {
        id: "evt-open",
        at: new Date().toISOString(),
        kind: "update",
        text: "Incident opened. Investigation started.",
      },
    ],
  };
}

export function addEvent(
  incident: Incident,
  event: Omit<IncidentEvent, "id" | "at">,
): Incident {
  const text = event.text.trim();
  if (!text) throw new Error("Timeline entry cannot be empty.");
  return {
    ...incident,
    events: [
      ...incident.events,
      {
        ...event,
        text,
        id: "evt-" + Date.now().toString(36),
        at: new Date().toISOString(),
      },
    ],
  };
}

export function advanceStatus(
  incident: Incident,
  status: IncidentStatus,
): Incident {
  const currentIndex = statusOrder.indexOf(incident.status);
  const nextIndex = statusOrder.indexOf(status);
  if (nextIndex < currentIndex)
    throw new Error("Incident status cannot move backward.");
  if (nextIndex > currentIndex + 1)
    throw new Error("Move through each response stage in order.");
  if (status === incident.status) return incident;
  return addEvent(
    { ...incident, status },
    { kind: "update", text: "Status changed to " + status + "." },
  );
}

export function buildStakeholderUpdate(incident: Incident): string {
  const latest = incident.events.at(-1)?.text ?? "Investigation is active.";
  return [
    incident.severity + ": " + incident.title,
    "Status: " + incident.status,
    "Affected service: " + incident.affectedService,
    "Current objective: " + incident.objective,
    "Latest: " + latest,
    "Next update: in 20 minutes or sooner if conditions change.",
  ].join("\n");
}

export function incidentToMarkdown(incident: Incident): string {
  return [
    "# " + incident.title,
    "",
    "- Severity: " + incident.severity,
    "- Status: " + incident.status,
    "- Started: " + incident.startedAt,
    "- Service: " + incident.affectedService,
    "- Commander: " + incident.commander,
    "- Scribe: " + incident.scribe,
    "",
    "## Objective",
    "",
    incident.objective,
    "",
    "## Timeline",
    "",
    ...incident.events.map(
      (event) =>
        "- " +
        event.at +
        " [" +
        event.kind +
        "] " +
        event.text +
        (event.owner ? " (" + event.owner + ")" : ""),
    ),
    "",
    "## Stakeholder update",
    "",
    buildStakeholderUpdate(incident),
  ].join("\n");
}

export function parseIncident(value: unknown): Incident {
  if (!value || typeof value !== "object")
    throw new Error("The file does not contain an incident.");
  const candidate = value as Partial<Incident>;
  if (
    !candidate.title ||
    !candidate.severity ||
    !candidate.status ||
    !Array.isArray(candidate.events)
  )
    throw new Error("The incident file is missing required fields.");
  if (!statusOrder.includes(candidate.status))
    throw new Error("The incident status is unsupported.");
  return candidate as Incident;
}
