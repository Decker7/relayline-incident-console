<script lang="ts">
  import "./+page.css";
  import { onMount } from "svelte";
  import {
    IconActivityHeartbeat,
    IconAlertTriangle,
    IconArrowRight,
    IconBolt,
    IconCheck,
    IconClipboard,
    IconCloudOff,
    IconDownload,
    IconFileImport,
    IconPlus,
    IconRadio,
    IconTrash,
    IconUsers,
    IconX,
  } from "@tabler/icons-svelte";
  import {
    addEvent,
    advanceStatus,
    buildStakeholderUpdate,
    createIncident,
    incidentToMarkdown,
    parseIncident,
    sampleIncident,
    statusOrder,
    type EventKind,
    type Incident,
    type IncidentStatus,
    type Severity,
  } from "$lib/incident";

  let ready = false;
  let incident: Incident | null = null;
  let error = "";
  let notice = "";
  let eventText = "";
  let eventOwner = "";
  let eventKind: EventKind = "update";
  let showUpdate = false;
  let newTitle = "";
  let newService = "";
  let newObjective = "";
  let newSeverity: Severity = "SEV-2";
  let importInput: HTMLInputElement;

  $: stakeholderUpdate = incident ? buildStakeholderUpdate(incident) : "";
  $: actionCount =
    incident?.events.filter((event) => event.kind === "action").length ?? 0;
  $: decisionCount =
    incident?.events.filter((event) => event.kind === "decision").length ?? 0;
  $: nextStatus = incident
    ? statusOrder[statusOrder.indexOf(incident.status) + 1]
    : undefined;

  onMount(() => {
    window.setTimeout(() => {
      const stored = localStorage.getItem("relayline-incident");
      if (stored === "empty") incident = null;
      else if (stored) {
        try {
          incident = parseIncident(JSON.parse(stored));
        } catch {
          incident = sampleIncident;
          error =
            "The saved incident was damaged, so Relayline loaded a safe sample record.";
        }
      } else incident = sampleIncident;
      ready = true;
    }, 260);
  });

  function persist(next: Incident | null) {
    incident = next;
    localStorage.setItem(
      "relayline-incident",
      next ? JSON.stringify(next) : "empty",
    );
  }

  function updateIncident(changes: Partial<Incident>) {
    if (!incident) return;
    persist({ ...incident, ...changes });
  }

  function createNewIncident() {
    error = "";
    try {
      const next = createIncident({
        title: newTitle,
        severity: newSeverity,
        affectedService: newService,
        objective: newObjective,
      });
      persist(next);
      notice = "Incident opened. The response clock is running.";
      newTitle = "";
      newService = "";
      newObjective = "";
    } catch (creationError) {
      error =
        creationError instanceof Error
          ? creationError.message
          : "The incident could not be created.";
    }
  }

  function submitEvent() {
    if (!incident) return;
    error = "";
    try {
      persist(
        addEvent(incident, {
          kind: eventKind,
          text: eventText,
          owner: eventOwner.trim() || undefined,
        }),
      );
      eventText = "";
      eventOwner = "";
      notice = "Timeline updated.";
    } catch (eventError) {
      error =
        eventError instanceof Error
          ? eventError.message
          : "The timeline entry could not be added.";
    }
  }

  function moveStatus(status: IncidentStatus) {
    if (!incident) return;
    try {
      persist(advanceStatus(incident, status));
      notice = "Incident moved to " + status + ".";
      error = "";
    } catch (statusError) {
      error =
        statusError instanceof Error
          ? statusError.message
          : "The status could not be changed.";
    }
  }

  function download(name: string, contents: string, type: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadMarkdown() {
    if (!incident) return;
    download(
      "relayline-incident.md",
      incidentToMarkdown(incident),
      "text/markdown",
    );
  }

  async function copyUpdate() {
    try {
      await navigator.clipboard.writeText(stakeholderUpdate);
      notice = "Stakeholder update copied.";
    } catch {
      error =
        "Clipboard access is unavailable. Select the update text and copy it manually.";
    }
  }

  function importIncident(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        persist(parseIncident(JSON.parse(String(reader.result))));
        notice = "Incident imported successfully.";
        error = "";
      } catch (importError) {
        error =
          importError instanceof Error
            ? importError.message
            : "The incident could not be imported.";
      }
    };
    reader.onerror = () => (error = "The selected file could not be read.");
    reader.readAsText(file);
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  function elapsed(value: string) {
    const minutes = Math.max(
      0,
      Math.round((Date.now() - new Date(value).getTime()) / 60000),
    );
    return minutes >= 60
      ? Math.floor(minutes / 60) + "h " + (minutes % 60) + "m"
      : minutes + "m";
  }
</script>

<svelte:head>
  <title>Relayline Incident Console</title>
  <meta
    name="description"
    content="An offline-first incident command console for small engineering teams."
  />
  <meta name="theme-color" content="#18201f" />
</svelte:head>

{#if !ready}
  <main class="loading-shell" aria-busy="true">
    <div class="loading-brand"><span></span><strong>Relayline</strong></div>
    <div class="loading-grid"><span></span><span></span><span></span></div>
    <p class="sr-only">Loading the incident console</p>
  </main>
{:else if !incident}
  <main class="empty-shell">
    <section class="empty-copy" aria-labelledby="empty-title">
      <div class="brand-symbol"><IconRadio size={26} stroke={1.8} /></div>
      <p class="eyebrow">Relayline Incident Console</p>
      <h1 id="empty-title">Open a calm response channel.</h1>
      <p>
        Coordinate ownership, decisions, updates, and recovery from one durable
        offline record.
      </p>
      <button
        class="text-button"
        onclick={() => {
          persist(sampleIncident);
          notice = "Sample incident loaded.";
        }}
      >
        Load the sample response <IconArrowRight size={18} />
      </button>
    </section>

    <form
      class="create-panel"
      onsubmit={(event) => {
        event.preventDefault();
        createNewIncident();
      }}
    >
      <div>
        <h2>Open an incident</h2>
        <p>Start with the minimum reliable context.</p>
      </div>
      {#if error}<div class="form-error" role="alert">
          <IconAlertTriangle size={18} />
          {error}
        </div>{/if}
      <label
        >Incident title<input
          bind:value={newTitle}
          placeholder="Checkout requests timing out"
          aria-describedby="title-help"
        /><small id="title-help">Name the customer-visible symptom.</small
        ></label
      >
      <div class="form-row">
        <label
          >Affected service<input
            bind:value={newService}
            placeholder="Payment gateway"
          /></label
        >
        <label
          >Severity<select bind:value={newSeverity}
            ><option>SEV-1</option><option>SEV-2</option><option>SEV-3</option
            ></select
          ></label
        >
      </div>
      <label
        >Current objective<textarea
          bind:value={newObjective}
          rows="3"
          placeholder="Stabilize requests and confirm impact"
        ></textarea></label
      >
      <button class="primary-button" type="submit"
        ><IconBolt size={18} /> Open incident</button
      >
      <span class="privacy-note"
        ><IconCloudOff size={16} /> Stored only on this device</span
      >
    </form>
  </main>
{:else}
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#main"
        ><span class="brand-symbol"><IconRadio size={19} stroke={1.9} /></span
        ><span>Relayline<small>Incident console</small></span></a
      >
      <div class="top-actions">
        <span class="offline-label"
          ><IconCloudOff size={17} /> Local record</span
        >
        <button
          class="icon-button"
          aria-label="Import incident"
          onclick={() => importInput.click()}
          ><IconFileImport size={19} /></button
        >
        <button
          class="button"
          onclick={() =>
            download(
              "relayline-incident.json",
              JSON.stringify(incident, null, 2),
              "application/json",
            )}><IconDownload size={18} /> Export</button
        >
        <input
          class="sr-only"
          bind:this={importInput}
          type="file"
          aria-label="Import a Relayline incident"
          accept="application/json,.json"
          onchange={(event) => importIncident(event.currentTarget.files?.[0])}
        />
      </div>
    </header>

    <main id="main">
      {#if notice}<div class="notice success" role="status">
          <IconCheck size={18} />
          {notice}<button
            aria-label="Dismiss message"
            onclick={() => (notice = "")}><IconX size={16} /></button
          >
        </div>{/if}
      {#if error}<div class="notice error" role="alert">
          <IconAlertTriangle size={18} />
          {error}<button aria-label="Dismiss error" onclick={() => (error = "")}
            ><IconX size={16} /></button
          >
        </div>{/if}

      <section class="incident-header" aria-labelledby="incident-title">
        <div>
          <div class="incident-meta">
            <span class:critical={incident.severity === "SEV-1"}
              >{incident.severity}</span
            ><span>{incident.affectedService}</span><span
              >Open {elapsed(incident.startedAt)}</span
            >
          </div>
          <h1 id="incident-title">{incident.title}</h1>
          <p>{incident.objective}</p>
        </div>
        <div class="status-action">
          <span>Current status</span><strong>{incident.status}</strong>
          {#if nextStatus}<button onclick={() => moveStatus(nextStatus)}
              >Move to {nextStatus}<IconArrowRight size={17} /></button
            >{:else}<small>Response complete</small>{/if}
        </div>
      </section>

      <nav class="status-track" aria-label="Incident status">
        {#each statusOrder as status, index (status)}
          <button
            class:complete={index <= statusOrder.indexOf(incident.status)}
            class:current={status === incident.status}
            onclick={() => moveStatus(status)}
            aria-current={status === incident.status ? "step" : undefined}
          >
            <span
              >{index < statusOrder.indexOf(incident.status)
                ? "Done"
                : index + 1}</span
            >{status}
          </button>
        {/each}
      </nav>

      <div class="command-grid">
        <aside class="command-rail">
          <section class="ownership panel" aria-labelledby="owners-title">
            <div class="panel-title">
              <IconUsers size={20} />
              <h2 id="owners-title">Response owners</h2>
            </div>
            <label
              >Incident commander<input
                value={incident.commander}
                onblur={(event) =>
                  updateIncident({
                    commander: event.currentTarget.value.trim() || "Unassigned",
                  })}
              /></label
            >
            <label
              >Scribe<input
                value={incident.scribe}
                onblur={(event) =>
                  updateIncident({
                    scribe: event.currentTarget.value.trim() || "Unassigned",
                  })}
              /></label
            >
          </section>

          <section class="signal-strip" aria-label="Response summary">
            <div>
              <span>Timeline</span><strong>{incident.events.length}</strong>
            </div>
            <div><span>Actions</span><strong>{actionCount}</strong></div>
            <div><span>Decisions</span><strong>{decisionCount}</strong></div>
          </section>

          <section class="update-panel panel" aria-labelledby="update-title">
            <div class="panel-title">
              <IconActivityHeartbeat size={20} />
              <h2 id="update-title">Stakeholder update</h2>
            </div>
            <p>Generated from the latest incident state.</p>
            <button
              class="button full"
              onclick={() => (showUpdate = !showUpdate)}
              >{showUpdate ? "Hide update" : "Review update"}</button
            >
            {#if showUpdate}
              <textarea
                aria-label="Stakeholder update draft"
                rows="10"
                readonly
                value={stakeholderUpdate}
              ></textarea>
              <button class="button full" onclick={copyUpdate}
                ><IconClipboard size={17} /> Copy update</button
              >
            {/if}
          </section>
        </aside>

        <section class="timeline panel" aria-labelledby="timeline-title">
          <div class="timeline-heading">
            <div>
              <h2 id="timeline-title">Operational timeline</h2>
              <p>A single ordered record of facts, actions, and decisions.</p>
            </div>
            <button class="text-button" onclick={downloadMarkdown}
              ><IconDownload size={17} /> Markdown</button
            >
          </div>

          <ol>
            {#each [...incident.events].reverse() as item (item.id)}
              <li class:decision={item.kind === "decision"}>
                <time datetime={item.at}>{formatTime(item.at)}</time>
                <div class="event-marker" aria-hidden="true"></div>
                <div>
                  <div class="event-meta">
                    <span>{item.kind}</span>{#if item.owner}<span
                        >{item.owner}</span
                      >{/if}
                  </div>
                  <p>{item.text}</p>
                </div>
              </li>
            {/each}
          </ol>

          <form
            class="event-form"
            onsubmit={(event) => {
              event.preventDefault();
              submitEvent();
            }}
          >
            <div class="event-form-top">
              <label
                >Entry type<select bind:value={eventKind}
                  ><option value="update">Update</option><option value="action"
                    >Action</option
                  ><option value="decision">Decision</option></select
                ></label
              >
              <label
                >Owner (optional)<input
                  bind:value={eventOwner}
                  placeholder="Team or person"
                /></label
              >
            </div>
            <label
              >Timeline entry<textarea
                bind:value={eventText}
                rows="3"
                placeholder="What changed, what was decided, or what happens next"
              ></textarea></label
            >
            <button class="primary-button" type="submit"
              ><IconPlus size={18} /> Add to timeline</button
            >
          </form>
        </section>
      </div>

      <footer>
        <div>
          <strong>Relayline</strong><span
            >Offline-first incident coordination.</span
          >
        </div>
        <button
          class="danger-link"
          onclick={() => {
            persist(null);
            notice = "";
            error = "";
          }}><IconTrash size={17} /> Archive locally</button
        >
      </footer>
    </main>
  </div>
{/if}
