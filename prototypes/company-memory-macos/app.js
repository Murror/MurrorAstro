const state = {
  screen: "today",
  sessionStage: "idle",
  selectedMode: "advise",
  knowledgeVerified: false,
  simulatedState: "active",
  customMessages: [],
};

const workspace = document.querySelector("#workspace");
const inspector = document.querySelector("#inspector");
const sheetRoot = document.querySelector("#sheet-root");
const commandRoot = document.querySelector("#command-root");
const toastRoot = document.querySelector("#toast-root");
const connectionBanner = document.querySelector("#connection-banner");
const appGrid = document.querySelector(".app-grid");

const people = {
  astro: { name: "Astro", initial: "A", tone: "pearl" },
  thanh: { name: "Thanh", initial: "T", tone: "cyan" },
  mona: { name: "Mona", initial: "M", tone: "violet" },
  dominic: { name: "Dominic", initial: "D", tone: "pearl" },
};

const commandItems = [
  { label: "Today", meta: "Overview", screen: "today", symbol: "◉" },
  { label: "# product", meta: "Channel", screen: "channel", symbol: "#" },
  { label: "Thanh", meta: "Direct message", screen: "dm", symbol: "T" },
  { label: "Company progress", meta: "Work", screen: "company-map", symbol: "↗" },
  { label: "Company Memory alpha", meta: "Mission progress", screen: "mission-map", symbol: "◇" },
  { label: "Company Memory", meta: "Knowledge", screen: "knowledge", symbol: "◌" },
  { label: "Claude", meta: "Agent", screen: "agents", symbol: "✦" },
];

function avatar(person, extraClass = "") {
  return `<span class="person-avatar ${person.tone} ${extraClass}" aria-hidden="true">${person.initial}</span>`;
}

function screenHeader(title, subtitle, actions = "") {
  return `
    <header class="screen-header">
      <div class="screen-title-group">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="header-actions">${actions}</div>
    </header>
  `;
}

function renderToday() {
  return `
    <section class="screen" data-prototype-screen="today">
      ${screenHeader(
        "Today",
        "A calm view of what needs you",
        `<button class="secondary-button" data-screen="company-map" type="button">Open progress</button>`,
      )}
      <div class="screen-scroll">
        <div class="today-content">
          <div class="today-intro">
            <div>
              <span class="eyebrow">Thursday · company checkpoint</span>
              <h1>Good afternoon, Astro.<br /><em>Three things need you.</em></h1>
            </div>
            <div class="date-block">JUL 23<br />1:42 PM PDT</div>
          </div>

          <div class="attention-strip">
            <button class="attention-card approval" data-screen="mission-map" type="button">
              <small>Decision needed</small>
              <strong>Choose what Claude can access</strong>
              <span>Native platform · 8 min ago</span>
            </button>
            <button class="attention-card context" data-action="refill-context" type="button">
              <small>Context requested</small>
              <strong>Claude needs the latest mobile decision</strong>
              <span>Product mission · 14 min ago</span>
            </button>
            <button class="attention-card agent-work" data-screen="channel" type="button">
              <small>Agents working</small>
              <strong>Two focused sessions are moving safely</strong>
              <span>Claude · Codex · $1.44 today</span>
            </button>
          </div>

          <section class="today-section" aria-labelledby="moving-heading">
            <div class="today-section-header">
              <h2 id="moving-heading">Moving now</h2>
              <button data-screen="company-map" type="button">See all progress →</button>
            </div>
            <div class="progress-list">
              <button class="progress-row" data-screen="mission-map" type="button">
                <span class="progress-icon agent">✦</span>
                <span class="progress-copy"><strong>Native Murror client</strong><span>Claude is shaping how agents collaborate</span></span>
                <span class="state-pill working"><span class="status-dot working"></span>Working</span>
              </button>
              <button class="progress-row" data-screen="knowledge" type="button">
                <span class="progress-icon verified">✓</span>
                <span class="progress-copy"><strong>Company Memory model</strong><span>Five knowledge types verified by Astro</span></span>
                <span class="state-pill verified">Verified</span>
              </button>
              <button class="progress-row" data-screen="mission-map" type="button">
                <span class="progress-icon blocked">!</span>
                <span class="progress-copy"><strong>Claude joining Murror</strong><span>Waiting for Astro to choose what Claude may access</span></span>
                <span class="state-pill context">Needs context</span>
              </button>
            </div>
          </section>

          <section class="today-section" aria-labelledby="changed-heading">
            <div class="today-section-header">
              <h2 id="changed-heading">Changed since you left</h2>
              <button data-action="show-since-left" type="button">View timeline →</button>
            </div>
            <div class="progress-list">
              <button class="progress-row" data-screen="knowledge" type="button">
                <span class="progress-icon verified">↗</span>
                <span class="progress-copy"><strong>Native-first direction became company knowledge</strong><span>Human verified · 2 sources · affects 3 missions</span></span>
                <span class="state-pill verified">Decision</span>
              </button>
              <button class="progress-row" data-screen="channel" type="button">
                <span class="progress-icon">#</span>
                <span class="progress-copy"><strong># product gained a new mission</strong><span>Created from Astro’s conversation with the team</span></span>
                <span class="state-pill">12:54 PM</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderMessage(person, time, body, reactions = "") {
  return `
    <article class="message">
      ${avatar(person)}
      <div>
        <div class="message-meta"><strong>${person.name}</strong><time>${time}</time></div>
        <div class="message-body">${body}</div>
        ${reactions ? `<div class="message-reactions">${reactions}</div>` : ""}
      </div>
    </article>
  `;
}

function renderWorkSession() {
  if (state.sessionStage === "idle") {
    return `
      <div class="work-session">
        <div class="session-header">
          <span class="agent-orb">C</span>
          <div class="session-title"><strong>Claude is ready to join</strong><span>NOT STARTED · OWNER ASTRO</span></div>
          <span class="session-cost">$0.00</span>
        </div>
        <div class="session-body">
          <div class="session-summary">
            <span>Start a bounded Work Session using this thread and the approved architecture decision.</span>
          </div>
          <div class="session-actions">
            <button class="context-action" data-action="start-claude" type="button">Summon Claude</button>
            <button data-screen="mission-map" type="button">View progress</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.sessionStage === "paused") {
    return `
      <div class="work-session">
        <div class="session-header">
          <span class="agent-orb">C</span>
          <div class="session-title"><strong>Claude · API parity audit</strong><span>PAUSED SAFELY · CHECKPOINT 2 OF 4</span></div>
          <span class="session-cost">$0.82</span>
        </div>
        <div class="session-body">
          <div class="context-callout"><span>Checkpoint preserved. Claude retains no active local access.</span></div>
          <div class="session-actions">
            <button class="context-action" data-action="resume-session" type="button">Resume session</button>
            <button data-screen="mission-map" type="button">View progress</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.sessionStage === "completed") {
    return `
      <div class="work-session complete">
        <div class="session-header">
          <span class="agent-orb">C</span>
          <div class="session-title"><strong>Claude · API parity audit</strong><span>COMPLETED · VERIFIED BY ASTRO</span></div>
          <span class="session-cost">$1.18</span>
        </div>
        <div class="session-body">
          <div class="session-summary">
            <span>Outcome accepted with 3 artifacts, 4 tests, and one verified decision.</span>
            <span class="state-pill verified">Verified</span>
          </div>
          <div class="session-actions">
            <button class="review-action" data-screen="knowledge" type="button">View company memory</button>
            <button data-screen="mission-map" type="button">View outcome</button>
          </div>
        </div>
      </div>
    `;
  }

  const needsContext = state.sessionStage === "needs-context";
  const reviewReady = state.sessionStage === "review";

  return `
    <div class="work-session ${needsContext ? "context-needed" : ""}" data-prototype-screen="active-work-session">
      <div class="session-header">
        <span class="agent-orb">C</span>
        <div class="session-title">
          <strong>Claude · API parity audit</strong>
          <span>${reviewReady ? "READY FOR REVIEW" : needsContext ? "WAITING FOR CONTEXT" : "WORKING"} · OWNER ASTRO</span>
        </div>
        <span class="session-cost">${reviewReady ? "$1.18" : "$0.82"}</span>
      </div>
      <div class="session-body">
        <div class="session-summary">
          <span>${reviewReady ? "Artifact ready · 3 sources · 4 tests" : "Step 2 of 4 · comparing staging responses"}</span>
          <span class="state-pill ${reviewReady ? "verified" : needsContext ? "context" : "working"}">${reviewReady ? "Review" : needsContext ? "Needs context" : "Working"}</span>
        </div>
        <div class="step-list">
          <div class="step done"><span class="step-icon">✓</span><span>Read the current API contract</span><span>2m</span></div>
          <div class="step ${reviewReady ? "done" : "active"}"><span class="step-icon">${reviewReady ? "✓" : "2"}</span><span>Compare staging responses</span><span>${reviewReady ? "5m" : "now"}</span></div>
          <div class="step ${reviewReady ? "done" : needsContext ? "needs-context" : ""}"><span class="step-icon">${reviewReady ? "✓" : "3"}</span><span>Run focused tests</span><span>${reviewReady ? "4/4" : "waiting"}</span></div>
          <div class="step ${reviewReady ? "active" : ""}"><span class="step-icon">4</span><span>Prepare findings</span><span>${reviewReady ? "ready" : "queued"}</span></div>
        </div>
        ${
          needsContext
            ? `<div class="context-callout"><span>Missing: current mobile response expectation</span><button class="ghost-button" data-action="refill-context" type="button">Refill context →</button></div>`
            : ""
        }
        <div class="session-actions">
          ${reviewReady ? `<button class="review-action" data-action="review-outcome" type="button">Review artifact</button>` : `<button class="context-action" data-action="refill-context" type="button">Refill context</button>`}
          <button data-screen="mission-map" type="button">View progress</button>
          <button data-action="pause-session" type="button">Pause</button>
          <button data-action="stop-session" type="button">Stop</button>
        </div>
      </div>
    </div>
  `;
}

function renderChannel(channelName = "product") {
  const customMessages = state.customMessages
    .map((message) => renderMessage(people.astro, "now", `<p>${message}</p>`, ""))
    .join("");

  return `
    <section class="screen" data-prototype-screen="channel">
      ${screenHeader(
        `# ${channelName}`,
        channelName === "product" ? "Product decisions, active missions, and customer truth" : "Durable company conversation",
        `<button class="ghost-button" data-action="channel-members" type="button">6 members</button><button class="secondary-button" data-action="start-claude" type="button"><span aria-hidden="true">✦</span> Summon Claude</button>`,
      )}
      <div class="conversation">
        <div class="message-list" id="message-list">
          <div class="day-divider">Today · Product room</div>
          ${renderMessage(
            people.astro,
            "12:41 PM",
            `<p>I want this to become our home for company conversation, not another dashboard beside Slack.</p><p>The most important thing is that everyone can understand what’s moving and safely help refill an agent’s context.</p>`,
            `<button class="reaction" type="button">✦ 4</button><button class="reaction" type="button">Clear direction · 2</button>`,
          )}
          ${renderMessage(
            people.mona,
            "12:47 PM",
            `<p>The calm Today view works. For Progress, I’d keep the four stages visible and let each Mission show one clear next move.</p>`,
            `<button class="reaction" type="button">✓ 3</button>`,
          )}
          ${renderMessage(
            people.thanh,
            "12:52 PM",
            `<p>I added the current staging contract to the mission. <span class="mention">@Claude</span> can compare it, but mobile’s expected response is still missing.</p>`,
          )}
          ${renderWorkSession()}
          ${customMessages}
        </div>
        <div class="composer-wrap">
          <div class="composer">
            <label class="visually-hidden" for="channel-message">Message # ${channelName}</label>
            <textarea id="channel-message" placeholder="Message # ${channelName} or summon @Claude…"></textarea>
            <div class="composer-toolbar">
              <div class="composer-tools">
                <button class="composer-tool" type="button" aria-label="Attach file">＋</button>
                <button class="composer-tool" type="button" aria-label="Add reaction">☺</button>
                <button class="composer-tool agent-button" data-action="start-claude" type="button">✦ Agent</button>
              </div>
              <div class="composer-send">
                <button class="send-button" data-action="send-message" type="button" aria-label="Send message">↑</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDM() {
  return `
    <section class="screen" data-prototype-screen="direct-message">
      ${screenHeader("Thanh", "Direct message · private to two people", `<button class="ghost-button" data-action="start-call" type="button">Audio</button><button class="secondary-button" data-action="convert-dm" type="button">Make private channel</button>`)}
      <div class="conversation">
        <div class="message-list">
          <div class="day-divider">Private conversation</div>
          ${renderMessage(people.thanh, "11:18 AM", `<p>I reviewed the API notes. The important mismatch is the mobile expectation, not the backend response itself.</p>`)}
          ${renderMessage(people.astro, "11:24 AM", `<p>Can you share only that part into the Product mission? The rest should stay between us.</p>`)}
          ${renderMessage(people.thanh, "11:26 AM", `<p>Done. I created a scoped Context Capsule and linked the original source without exposing this DM.</p>`, `<button class="reaction" type="button">✓ Shared safely</button>`)}
        </div>
        <div class="composer-wrap">
          <div class="composer">
            <label class="visually-hidden" for="dm-message">Message Thanh</label>
            <textarea id="dm-message" placeholder="Message Thanh…"></textarea>
            <div class="composer-toolbar"><div class="composer-tools"><button class="composer-tool" type="button">＋</button></div><button class="send-button" data-action="send-dm" type="button">↑</button></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function getMissionProgress() {
  if (state.sessionStage === "completed") return { index: 3, label: "Done", condition: "Checked", next: "Share the accepted outcome with the team" };
  if (state.sessionStage === "review") return { index: 2, label: "Almost there", condition: "Ready for you", next: "Astro reviews Claude’s result" };
  if (state.sessionStage === "needs-context") return { index: 1, label: "In motion", condition: "Needs a little help", next: "Share the latest mobile decision" };
  if (state.sessionStage === "paused") return { index: 1, label: "In motion", condition: "Paused for now", next: "Resume from the saved checkpoint" };
  return { index: 0, label: "Up next", condition: "Ready to begin", next: "Start a focused session with Claude" };
}

function progressTrack(activeIndex, label) {
  const stages = ["Up next", "In motion", "Almost there", "Done"];
  return `
    <div class="ledger-track" role="img" aria-label="${label}: ${stages[activeIndex]}">
      ${stages.map((stage, index) => `<span class="track-step ${index < activeIndex ? "is-past" : ""} ${index === activeIndex ? "is-current" : ""}"><span class="track-dot"></span><span class="track-label">${stage}</span></span>`).join("")}
    </div>
  `;
}

function renderCompanyMap() {
  const active = getMissionProgress();
  const activePeople = `<span class="ledger-people"><span class="paper-avatar astro">A</span><span class="paper-avatar agent">C</span><span>Astro + Claude</span></span>`;
  return `
    <section class="screen progress-screen" data-prototype-screen="company-progress">
      <div class="progress-sheet">
        <header class="progress-topbar">
          <div><span class="paper-eyebrow">Company progress</span><h1>Where everything stands</h1></div>
          <div class="paper-actions"><span class="updated-copy">Updated just now</span><button class="paper-button" data-action="new-mission" type="button">New mission</button></div>
        </header>

        <section class="horizon-card" aria-labelledby="horizon-heading">
          <div class="horizon-orbit orbit-one"></div><div class="horizon-orbit orbit-two"></div>
          <div class="horizon-copy"><span class="horizon-label">Today at Murror</span><h2 id="horizon-heading">Three things<br />are moving.</h2><p>Two are ready for you. The rest can keep moving quietly.</p></div>
          <div class="horizon-sun" aria-hidden="true"><span></span></div>
        </section>

        <section class="stage-overview" aria-label="Progress stages">
          <button class="stage-summary up-next" data-action="filter-progress" data-stage="Up next" type="button"><span class="stage-number">2</span><span><strong>Up next</strong><small>Not started</small></span></button>
          <button class="stage-summary in-motion is-selected" data-action="filter-progress" data-stage="In motion" type="button"><span class="stage-number">3</span><span><strong>In motion</strong><small>Work has begun</small></span></button>
          <button class="stage-summary almost" data-action="filter-progress" data-stage="Almost there" type="button"><span class="stage-number">2</span><span><strong>Almost there</strong><small>Needs a final step</small></span></button>
          <button class="stage-summary done" data-action="filter-progress" data-stage="Done" type="button"><span class="stage-number">5</span><span><strong>Done</strong><small>Finished and checked</small></span></button>
        </section>

        <section class="progress-ledger" aria-labelledby="ledger-heading">
          <div class="ledger-heading"><div><span class="paper-eyebrow">Ready for you first</span><h2 id="ledger-heading">Company movement</h2></div><button data-action="show-since-left" type="button">What changed →</button></div>

          <button class="ledger-row is-featured" data-screen="mission-map" type="button">
            <span class="ledger-index">01</span>
            <span class="ledger-main"><span class="ledger-kicker">Product · ${active.label}</span><strong>Native Company Memory alpha</strong><small>${active.next}</small>${progressTrack(active.index, "Native Company Memory alpha")}</span>
            <span class="ledger-side"><span class="paper-condition ${active.index === 3 ? "checked" : active.index === 2 ? "ready" : active.index === 1 ? "help" : ""}">${active.condition}</span>${activePeople}<small>Changed just now</small></span>
          </button>

          <button class="ledger-row" data-action="open-mission-preview" data-mission="Secure local agent connection" type="button">
            <span class="ledger-index">02</span>
            <span class="ledger-main"><span class="ledger-kicker">Engineering · Up next</span><strong>Secure local agent connection</strong><small>Astro chooses what Claude may access</small>${progressTrack(0, "Secure local agent connection")}</span>
            <span class="ledger-side"><span class="paper-condition">Ready to begin</span><span class="ledger-people"><span class="paper-avatar astro">A</span><span>Astro</span></span><small>Added today</small></span>
          </button>

          <button class="ledger-row" data-action="open-mission-preview" data-mission="Murror onboarding story" type="button">
            <span class="ledger-index">03</span>
            <span class="ledger-main"><span class="ledger-kicker">Growth · Almost there</span><strong>Murror onboarding story</strong><small>Mona is preparing the final story for review</small>${progressTrack(2, "Murror onboarding story")}</span>
            <span class="ledger-side"><span class="paper-condition ready">Ready for you</span><span class="ledger-people"><span class="paper-avatar mona">M</span><span>Mona</span></span><small>Changed 18 min ago</small></span>
          </button>

          <button class="ledger-row is-complete" data-action="open-mission-preview" data-mission="Channels and direct messages" type="button">
            <span class="ledger-index">04</span>
            <span class="ledger-main"><span class="ledger-kicker">Company · Done</span><strong>Channels and direct messages</strong><small>The durable conversation model was checked by Astro</small>${progressTrack(3, "Channels and direct messages")}</span>
            <span class="ledger-side"><span class="paper-condition checked">Checked</span><span class="ledger-people"><span class="paper-avatar astro">A</span><span>Astro</span></span><small>Finished Tuesday</small></span>
          </button>
        </section>
      </div>
    </section>
  `;
}

function renderMissionMap() {
  const progress = getMissionProgress();
  const isCompleted = progress.index === 3;
  const isReview = progress.index === 2;
  const needsHelp = state.sessionStage === "needs-context";
  const isPaused = state.sessionStage === "paused";
  const nowTitle = isCompleted ? "Done and checked" : isReview ? "The result is ready for you" : needsHelp ? "Claude is waiting for one answer" : isPaused ? "Work is safely paused" : progress.index === 0 ? "Ready when you are" : "Claude is helping";
  const nowBody = isCompleted ? "Astro accepted the collaboration contract and preserved the supporting evidence." : isReview ? "Claude finished the comparison. One human review moves this work to Done." : needsHelp ? "The latest mobile expectation is missing. A scoped note is ready to share." : isPaused ? "The checkpoint is preserved and no local access remains active." : "Start with the approved product direction and a clearly bounded session.";
  const primaryAction = isCompleted ? `<button class="paper-button primary" data-screen="knowledge" type="button">View accepted decision</button>` : isReview ? `<button class="paper-button primary" data-action="review-outcome" type="button">Review the result</button>` : needsHelp ? `<button class="paper-button primary" data-action="refill-context" type="button">Share the missing answer</button>` : isPaused ? `<button class="paper-button primary" data-action="resume-session" type="button">Resume work</button>` : `<button class="paper-button primary" data-action="start-claude" type="button">Start with Claude</button>`;
  return `
    <section class="screen progress-screen mission-progress-screen" data-prototype-screen="mission-progress">
      <div class="progress-sheet">
        <header class="progress-topbar">
          <button class="paper-back" data-screen="company-map" type="button">← All progress</button>
          <div class="paper-actions"><button class="paper-link" data-screen="channel" type="button">Open # product</button><button class="paper-button" data-action="how-we-know" type="button">How we know</button></div>
        </header>

        <section class="mission-horizon">
          <div class="mission-horizon-copy"><span class="horizon-label">Product mission</span><h1>Make Murror the team’s<br />daily collaboration home.</h1><p>Owned by Astro · Mona and Claude are helping</p></div>
          <div class="mission-stage-seal"><span>${String(progress.index + 1).padStart(2, "0")}</span><small>of 04</small></div>
        </section>

        <section class="mission-stage-panel" aria-label="Mission stage">
          <div class="mission-stage-intro"><span class="paper-eyebrow">Current stage</span><h2>${progress.label}</h2><p>${progress.condition}</p></div>
          ${progressTrack(progress.index, "Native Company Memory alpha")}
        </section>

        <section class="mission-story-grid">
          <article class="story-card now-card"><span class="story-number">Now</span><h2>${nowTitle}</h2><p>${nowBody}</p>${primaryAction}</article>
          <article class="story-card"><span class="story-number">Next</span><h3>${isCompleted ? "Bring the learning back to the team" : isReview ? "Accept it or ask for changes" : needsHelp ? "Claude finishes the focused checks" : "Compare the staging contract"}</h3><p>${isCompleted ? "The verified decision is now available to channels and future Work Sessions." : "One clear next move stays visible; the detailed work remains behind it."}</p></article>
          <article class="story-card ${needsHelp ? "attention-card-paper" : ""}"><span class="story-number">Help</span><h3>${needsHelp ? "The latest mobile decision" : isReview ? "Your final look" : isCompleted ? "Nothing is waiting" : "No blocker yet"}</h3><p>${needsHelp ? "Thanh shared a safe excerpt. The private conversation stays private." : isCompleted ? "The result and its source trail are safely preserved." : "If work needs context or a decision, it will appear here in plain language."}</p></article>
          <article class="story-card people-card"><span class="story-number">Together</span><div class="large-people"><span class="large-paper-avatar astro">A</span><span class="large-paper-avatar mona">M</span><span class="large-paper-avatar agent">C</span></div><h3>Astro, Mona, and Claude</h3><p>One accountable person. Agents remain visible as collaborators.</p></article>
        </section>

        <footer class="mission-footer"><span>${isCompleted ? "Checked just now" : "Last meaningful change · 8 minutes ago"}</span><button data-action="how-we-know" type="button">Sources, decisions, and activity →</button></footer>
      </div>
    </section>
  `;
}

function renderKnowledge() {
  return `
    <section class="screen" data-prototype-screen="company-memory">
      ${screenHeader("Company Memory", "Verified understanding with a path back to every source", `<button class="ghost-button" data-action="ask-murror" type="button">Ask Murror</button><button class="secondary-button" data-action="new-knowledge" type="button">New knowledge</button>`)}
      <div class="screen-scroll">
        <div class="knowledge-grid">
          <button class="knowledge-card" data-action="open-knowledge-detail" type="button">
            <span class="card-eyebrow">Decision · current</span>
            <h3>Native macOS is Murror’s primary client</h3>
            <p>The cloud remains the company system of record. Lightweight web access follows after the internal workflow is proven.</p>
            <span class="card-meta"><span>ASTRO · 3 SOURCES</span><span class="trust-pill">Human verified</span></span>
          </button>
          <button class="knowledge-card" data-action="open-knowledge-detail" type="button">
            <span class="card-eyebrow">Policy · current</span>
            <h3>Show work, never worker productivity</h3>
            <p>No scores, rankings, activity surveillance, or private-session ingestion. Unknown state remains visibly unknown.</p>
            <span class="card-meta"><span>TEAM POLICY · 2 SOURCES</span><span class="trust-pill">Human verified</span></span>
          </button>
          <button class="knowledge-card" data-action="open-knowledge-detail" type="button">
            <span class="card-eyebrow">Project state · needs review</span>
            <h3>Claude context bridge</h3>
            <p>The supported boundary is opt-in session publishing with previewed Context Capsules and structured checkpoints.</p>
            <span class="card-meta"><span>CLAUDE · 4 SOURCES</span><span class="trust-pill">Agent proposed</span></span>
          </button>
          <button class="knowledge-card" data-action="open-knowledge-detail" type="button">
            <span class="card-eyebrow">Handoff · current</span>
            <h3>Company Memory prototype restart point</h3>
            <p>Continue from the approved 10-screen prototype, then validate the vertical slice with the Murror team.</p>
            <span class="card-meta"><span>ASTRO · 1 ARTIFACT</span><span class="trust-pill">Human verified</span></span>
          </button>
          ${
            state.knowledgeVerified
              ? `<button class="knowledge-card" data-action="open-knowledge-detail" type="button"><span class="card-eyebrow">Decision · just verified</span><h3>Use versioned Context Capsules for agent collaboration</h3><p>Every refill preserves source, scope, author, recipient session, and downstream impact.</p><span class="card-meta"><span>ASTRO · 8 SOURCES</span><span class="trust-pill">Human verified</span></span></button>`
              : ""
          }
        </div>
      </div>
    </section>
  `;
}

function renderAgents() {
  return `
    <section class="screen" data-prototype-screen="agents">
      ${screenHeader("Agents", "Installed collaborators with visible scope, ownership, and cost", `<button class="secondary-button" data-action="connect-agent" type="button">Connect agent</button>`)}
      <div class="screen-scroll"><div class="agent-grid">
        <button class="knowledge-card" data-screen="channel" type="button"><span class="agent-orb">C</span><h3>Claude · Product researcher</h3><p>Owner Astro · # product · advise and draft · $1.18 today</p><span class="card-meta"><span>CLAUDE CODE · LOCAL</span><span class="state-pill working">Working</span></span></button>
        <button class="knowledge-card" data-screen="engineering" type="button"><span class="agent-orb">X</span><h3>Codex · Web engineer</h3><p>Owner Astro · # engineering · isolated worktree · $0.26 today</p><span class="card-meta"><span>CODEX · CLOUD</span><span class="state-pill working">Working</span></span></button>
      </div></div>
    </section>
  `;
}

function renderInbox() {
  return `
    <section class="screen" data-prototype-screen="inbox">
      ${screenHeader("Inbox", "Only mentions, assignments, blockers, and approvals", `<button class="ghost-button" data-action="mark-reviewed" type="button">Mark reviewed</button>`)}
      <div class="screen-scroll"><div class="today-content"><div class="progress-list">
        <button class="progress-row" data-screen="mission-map" type="button"><span class="progress-icon agent">✦</span><span class="progress-copy"><strong>Claude requested context from you</strong><span>Native Company Memory alpha · 14 min ago</span></span><span class="state-pill context">Context</span></button>
        <button class="progress-row" data-action="review-outcome" type="button"><span class="progress-icon verified">✓</span><span class="progress-copy"><strong>Outcome ready for your review</strong><span>API parity audit · 3 artifacts</span></span><span class="state-pill verified">Review</span></button>
      </div></div></div>
    </section>
  `;
}

function renderAgentPrivate() {
  return `
    <section class="screen" data-prototype-screen="private-agent-chat">
      ${screenHeader("Claude", "Private agent conversation · not shared with Company Memory", `<span class="permission-pill">Only you</span><button class="secondary-button" data-action="start-claude" type="button">Start bounded session</button>`)}
      <div class="empty-state"><div class="empty-state-inner"><div class="empty-state-symbol">✦</div><h2>Private until you share</h2><p>Explore an idea with Claude. Nothing from this conversation enters channels, Missions, or Company Memory without your explicit action.</p><button class="primary-button" data-action="start-claude" type="button">Start private session</button></div></div>
    </section>
  `;
}

function renderSimpleChannel(name, purpose) {
  return `
    <section class="screen" data-prototype-screen="channel-empty">
      ${screenHeader(`# ${name}`, purpose, `<button class="secondary-button" data-action="start-claude" type="button">✦ Summon Claude</button>`)}
      <div class="empty-state"><div class="empty-state-inner"><div class="empty-state-symbol">#</div><h2>Begin the ${name} conversation</h2><p>This channel starts fresh. Messages remain durable, searchable, and available as cited evidence within its permissions.</p><button class="primary-button" data-action="send-first-message" type="button">Write the first message</button></div></div>
    </section>
  `;
}

function renderSimulatedState(kind) {
  if (kind === "loading") {
    return `<section class="screen" data-lifecycle-state="loading">${screenHeader("Loading company context", "Restoring your exact place", "")}<div class="loading-skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div><button class="ghost-button state-return" data-action="return-live" type="button">Return to live prototype</button></section>`;
  }

  const copy = {
    empty: ["Nothing needs you", "Your mentions, approvals, blockers, and context requests will appear here.", "Return to Today"],
    blocked: ["A dependency is blocked", "The current mobile response expectation is missing. The mission is safe and resumable.", "Refill context"],
    offline: ["You’re working offline", "Recent conversations remain available. Shared agent actions will wait for Murror to reconnect.", "Reconnect"],
    "permission-denied": ["This room is private", "You no longer have access to this channel, its search results, or its cached knowledge.", "Return to Today"],
    "provider-disconnected": ["Claude is temporarily unavailable", "The checkpoint is preserved. No local tools remain active while the provider is disconnected.", "View checkpoint"],
    failed: ["The session stopped safely", "The agent process ended before producing an artifact. Completed steps and evidence remain available.", "Open restart point"],
    paused: ["Work Session paused", "Claude retains no active local access. Resume from checkpoint 2 when you’re ready.", "Resume session"],
    completed: ["Outcome verified", "The artifact, evidence, cost, and decision are now connected to the Mission and Company Memory.", "View outcome"],
    stale: ["This project needs review", "Its last verified checkpoint is older than the mission’s freshness window. Murror will not guess what happened.", "Review sources"],
  };

  const [title, body, action] = copy[kind] || copy.empty;
  return `
    <section class="screen" data-lifecycle-state="${kind}">
      ${screenHeader("Prototype state", `Lifecycle · ${kind.replaceAll("-", " ")}`, `<button class="ghost-button" data-action="open-states" type="button">All states</button>`)}
      <div class="empty-state"><div class="empty-state-inner"><div class="empty-state-symbol">${kind === "completed" ? "✓" : kind === "blocked" || kind === "failed" ? "!" : kind === "offline" ? "⌁" : "◇"}</div><h2>${title}</h2><p>${body}</p><button class="primary-button" data-action="return-live" type="button">${action}</button></div></div>
    </section>
  `;
}

function getScreen() {
  if (state.simulatedState !== "active") return renderSimulatedState(state.simulatedState);

  switch (state.screen) {
    case "today": return renderToday();
    case "inbox": return renderInbox();
    case "channel": return renderChannel("product");
    case "company": return renderSimpleChannel("company", "Company-wide decisions and shared direction");
    case "engineering": return renderSimpleChannel("engineering", "Architecture, releases, and technical evidence");
    case "design": return renderSimpleChannel("design", "Interaction language, prototypes, and design reviews");
    case "dm": return renderDM();
    case "agent-private": return renderAgentPrivate();
    case "company-map": return renderCompanyMap();
    case "mission-map": return renderMissionMap();
    case "knowledge": return renderKnowledge();
    case "agents": return renderAgents();
    default: return renderToday();
  }
}

function inspectorForScreen() {
  const peopleStack = `<div class="avatar-stack">${avatar(people.astro)}${avatar(people.thanh)}${avatar(people.mona)}${avatar(people.dominic)}</div>`;

  if (["company-map", "mission-map"].includes(state.screen)) {
    return `
      <div class="inspector-inner">
        <div class="inspector-header"><div><span class="inspector-eyebrow">Mission context</span><h2>Native Company Memory</h2></div><button class="quiet-button" type="button">•••</button></div>
        <section class="inspector-section"><h3>Outcome</h3><p>Make Murror the team’s durable, AI-native collaboration home.</p></section>
        <section class="inspector-section"><h3>People</h3>${peopleStack}</section>
        <section class="inspector-section"><h3>Attention</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">◇</span><div><strong>Mobile expectation missing</strong><span>Context needed by Claude</span></div></div><div class="inspector-row"><span class="row-icon">✓</span><div><strong>Architecture decision current</strong><span>Human verified · 3 sources</span></div></div></div></section>
        <section class="inspector-section"><h3>Agent scope</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">✦</span><div><strong>Claude · advise and draft</strong><span># product · selected repository · $5 cap</span></div></div></div></section>
        <section class="inspector-section"><h3>Sources</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">#</span><div><strong>Product direction</strong><span># product · today</span></div></div><div class="inspector-row"><span class="row-icon">D</span><div><strong>Approved design</strong><span>800 lines · current</span></div></div></div></section>
      </div>
    `;
  }

  if (state.screen === "knowledge") {
    return `
      <div class="inspector-inner">
        <div class="inspector-header"><div><span class="inspector-eyebrow">Knowledge</span><h2>Trust and provenance</h2></div></div>
        <section class="inspector-section"><h3>Trust order</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">✓</span><div><strong>Human verified</strong><span>Canonical company understanding</span></div></div><div class="inspector-row"><span class="row-icon">✦</span><div><strong>Agent proposed</strong><span>Requires review before use as truth</span></div></div><div class="inspector-row"><span class="row-icon">⌁</span><div><strong>Conversation evidence</strong><span>Searchable with source and visibility</span></div></div></div></section>
        <section class="inspector-section"><h3>Memory types</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">D</span><div><strong>Decision</strong><span>What, why, who, and what it replaces</span></div></div><div class="inspector-row"><span class="row-icon">P</span><div><strong>Project State</strong><span>Outcome, blocker, and next action</span></div></div><div class="inspector-row"><span class="row-icon">H</span><div><strong>Handoff</strong><span>Evidence and exact restart point</span></div></div></div></section>
      </div>
    `;
  }

  if (["channel", "company", "engineering", "design"].includes(state.screen)) {
    return `
      <div class="inspector-inner">
        <div class="inspector-header"><div><span class="inspector-eyebrow">Channel context</span><h2># ${state.screen === "channel" ? "product" : state.screen}</h2></div><button class="quiet-button" type="button">•••</button></div>
        <section class="inspector-section"><h3>People and agents</h3>${peopleStack}<div style="height:8px"></div><span class="permission-pill">Claude · scoped</span></section>
        <section class="inspector-section"><h3>Active mission</h3><button class="progress-row" style="grid-template-columns:24px 1fr;padding:8px;width:100%" data-screen="mission-map" type="button"><span class="progress-icon agent" style="width:24px;height:24px">✦</span><span class="progress-copy"><strong>Native Company Memory</strong><span>1 context need</span></span></button></section>
        <section class="inspector-section"><h3>Decisions</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">✓</span><div><strong>Native macOS primary</strong><span>Current · Astro · today</span></div></div><div class="inspector-row"><span class="row-icon">✓</span><div><strong>Hybrid knowledge</strong><span>Current · 4 sources</span></div></div></div></section>
        <section class="inspector-section"><h3>Privacy</h3><p>Channel members and explicitly installed agents. Private DMs are excluded.</p></section>
      </div>
    `;
  }

  if (state.screen === "dm" || state.screen === "agent-private") {
    return `
      <div class="inspector-inner">
        <div class="inspector-header"><div><span class="inspector-eyebrow">Private context</span><h2>${state.screen === "dm" ? "Astro + Thanh" : "Astro + Claude"}</h2></div></div>
        <section class="inspector-section"><h3>Visibility</h3><p>Only participants can search this conversation. Nothing enters Company Memory automatically.</p></section>
        <section class="inspector-section"><h3>Sharing rule</h3><div class="inspector-row"><span class="row-icon">↗</span><div><strong>Share selected context</strong><span>Preview source, recipient, and visibility first</span></div></div></section>
      </div>
    `;
  }

  return `
    <div class="inspector-inner">
      <div class="inspector-header"><div><span class="inspector-eyebrow">Today</span><h2>Company pulse</h2></div></div>
      <section class="inspector-section"><h3>Working now</h3><div class="inspector-list"><div class="inspector-row"><span class="row-icon">✦</span><div><strong>2 agent sessions</strong><span>1 working · 1 needs context</span></div></div><div class="inspector-row"><span class="row-icon">◇</span><div><strong>4 active missions</strong><span>1 decision needed</span></div></div></div></section>
      <section class="inspector-section"><h3>Agent limits</h3><p>Claude and Codex are both comfortably within today’s approved limits.</p></section>
      <section class="inspector-section"><h3>Quiet status</h3><p>No urgent blockers. Notifications are limited to mentions, context requests, and approvals.</p></section>
    </div>
  `;
}

function updateNavigation() {
  document.querySelectorAll(".nav-item[data-screen]").forEach((item) => {
    const target = item.dataset.screen;
    const active = target === state.screen || (state.screen === "mission-map" && target === "company-map");
    item.classList.toggle("is-active", active);
  });
}

function render() {
  workspace.innerHTML = getScreen();
  inspector.innerHTML = inspectorForScreen();
  appGrid.classList.toggle("progress-layout", ["company-map", "mission-map"].includes(state.screen) && state.simulatedState === "active");
  updateNavigation();
}

function navigate(screen) {
  state.screen = screen;
  state.simulatedState = "active";
  closeSheet();
  closeCommand();
  render();
  workspace.focus({ preventScroll: true });
}

function toast(message, tone = "human") {
  const icon = tone === "verified" ? "✓" : tone === "agent" ? "✦" : tone === "danger" ? "!" : "◇";
  const element = document.createElement("div");
  element.className = "toast";
  element.innerHTML = `<span class="state-pill ${tone === "verified" ? "verified" : tone === "agent" ? "working" : tone === "danger" ? "blocked" : ""}">${icon}</span><span>${message}</span>`;
  toastRoot.append(element);
  window.setTimeout(() => element.remove(), 3100);
}

function closeSheet() {
  sheetRoot.innerHTML = "";
}

function closeCommand() {
  commandRoot.innerHTML = "";
}

function openSheet(content, label) {
  sheetRoot.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet" role="presentation"><section class="sheet" role="dialog" aria-modal="true" aria-label="${label}" data-sheet-panel>${content}</section></div>`;
  window.setTimeout(() => sheetRoot.querySelector("button, input, textarea")?.focus(), 0);
}

function openStartWorkSession() {
  openSheet(
    `
      <header class="sheet-header"><div><h2>Start Claude Work Session</h2><p>Preview exactly what Claude can see and do</p></div><button class="close-button" data-action="close-sheet" type="button" aria-label="Close">×</button></header>
      <div class="sheet-body" data-prototype-screen="start-work-session">
        <div class="form-group"><label class="form-label" for="session-goal">Goal <span>Required</span></label><textarea class="text-area" id="session-goal">Audit the staging API and identify the exact product-parity gaps.</textarea></div>
        <div class="form-group"><div class="form-label">Context <span>3 selected · 1 private source excluded</span></div><div class="selection-list">
          <label class="selection-row"><input type="checkbox" checked /><span class="selection-copy"><strong>Current # product thread</strong><span>8 messages · channel visibility</span></span><span class="source-pill">Conversation</span></label>
          <label class="selection-row"><input type="checkbox" checked /><span class="selection-copy"><strong>Approved architecture decision</strong><span>Human verified · 3 sources</span></span><span class="source-pill">Knowledge</span></label>
          <label class="selection-row"><input type="checkbox" checked /><span class="selection-copy"><strong>Staging API contract</strong><span>Updated today · Thanh</span></span><span class="source-pill">Document</span></label>
          <label class="selection-row"><input type="checkbox" /><span class="selection-copy"><strong>Private DM with Thanh</strong><span>Excluded by default · requires explicit share</span></span><span class="source-pill">Private</span></label>
        </div></div>
        <div class="form-group"><div class="form-label">Permission mode <span>Owner Astro · $5 / 60 min</span></div><div class="mode-grid">
          <button class="mode-card ${state.selectedMode === "advise" ? "is-selected" : ""}" data-action="select-mode" data-mode="advise" type="button"><span class="mode-radio"></span><strong>Advise only</strong><span>Read sources and recommend. No files change.</span></button>
          <button class="mode-card ${state.selectedMode === "draft" ? "is-selected" : ""}" data-action="select-mode" data-mode="draft" type="button"><span class="mode-radio"></span><strong>Prepare drafts</strong><span>Work inside an isolated folder. Cannot publish.</span></button>
          <button class="mode-card ${state.selectedMode === "approve" ? "is-selected" : ""}" data-action="select-mode" data-mode="approve" type="button"><span class="mode-radio"></span><strong>Act after approval</strong><span>Every consequential action pauses for review.</span></button>
        </div></div>
        <div class="context-preview"><div class="context-preview-header"><strong>Claude will receive Context Capsule v3</strong><span class="permission-pill"># product</span></div><dl><dt>Local access</dt><dd>Selected murror-api worktree · read only</dd><dt>Tools</dt><dd>Read, Search, focused Tests</dd><dt>Knowledge</dt><dd>2 verified decisions · 1 policy</dd><dt>Excluded</dt><dd>Private DMs, secrets, unrelated repositories</dd></dl></div>
      </div>
      <footer class="sheet-footer"><span class="source-pill">Context hash · 8b1f…9c2a</span><div class="sheet-footer-actions"><button class="ghost-button" data-action="close-sheet" type="button">Cancel</button><button class="primary-button" data-action="begin-session" type="button">Start session</button></div></footer>
    `,
    "Start Claude Work Session",
  );
}

function openRefillContext() {
  openSheet(
    `
      <header class="sheet-header"><div><h2>Refill context</h2><p>Attach the missing source without exposing the full conversation</p></div><button class="close-button" data-action="close-sheet" type="button" aria-label="Close">×</button></header>
      <div class="sheet-body" data-prototype-screen="refill-context">
        <div class="context-callout"><span>Claude needs: current mobile response expectation</span><span class="state-pill context">Missing context</span></div>
        <div class="form-group"><div class="form-label">Choose a source <span>Permission checked</span></div><div class="selection-list">
          <label class="selection-row"><input name="context-source" type="radio" checked /><span class="selection-copy"><strong>Thanh’s scoped API note</strong><span>Shared from private DM · approved excerpt only</span></span><span class="source-pill">Recommended</span></label>
          <label class="selection-row"><input name="context-source" type="radio" /><span class="selection-copy"><strong>Current mobile contract</strong><span>Engineering channel · updated 22 min ago</span></span><span class="source-pill">Document</span></label>
          <label class="selection-row"><input name="context-source" type="radio" /><span class="selection-copy"><strong>Explain directly</strong><span>Write a new scoped context note</span></span><span class="source-pill">New</span></label>
        </div></div>
        <div class="form-group"><label class="form-label" for="context-note">Context note <span>Editable before sharing</span></label><textarea class="text-area" id="context-note">Mobile expects the response to preserve the current relationship summary and append the new agent-state fields without replacing existing keys.</textarea></div>
        <div class="context-preview"><div class="context-preview-header"><strong>Share preview</strong><span class="permission-pill">Product mission</span></div><dl><dt>Recipient</dt><dd>Claude · API parity audit</dd><dt>Downstream</dt><dd>Focused tests, artifact review</dd><dt>Visibility</dt><dd># product members and this Work Session</dd><dt>Knowledge</dt><dd>Supporting evidence, not verified truth</dd></dl></div>
      </div>
      <footer class="sheet-footer"><span class="source-pill">Context Capsule v4</span><div class="sheet-footer-actions"><button class="ghost-button" data-action="close-sheet" type="button">Cancel</button><button class="primary-button" data-action="confirm-refill" type="button">Refill context</button></div></footer>
    `,
    "Refill context",
  );
}

function openOutcomeReview() {
  openSheet(
    `
      <header class="sheet-header"><div><h2>Review Outcome Bundle</h2><p>Claude · API parity audit · owner Astro</p></div><button class="close-button" data-action="close-sheet" type="button" aria-label="Close">×</button></header>
      <div class="sheet-body" data-prototype-screen="outcome-review">
        <div class="context-preview"><div class="context-preview-header"><strong>Result</strong><span class="state-pill verified">Evidence ready</span></div><p style="margin:0;color:var(--mist);font-size:10px;line-height:1.55">The staging response can remain backward-compatible. Add the agent-state fields without replacing the current relationship summary, then verify four focused contract cases.</p></div>
        <div class="form-group" style="margin-top:16px"><div class="form-label">Evidence <span>3 artifacts · 4 tests</span></div><div class="outcome-grid">
          <div class="outcome-card"><small>Artifact</small><strong>Proposed response contract</strong><span>Diff · 18 additions · no removals</span></div>
          <div class="outcome-card"><small>Verification</small><strong>4 focused contract tests</strong><span>All passing · 1.4 seconds</span></div>
          <div class="outcome-card"><small>Decision</small><strong>Preserve existing response keys</strong><span>Proposed for Company Memory</span></div>
          <div class="outcome-card"><small>Remaining risk</small><strong>Older mobile build not exercised</strong><span>Follow-up test recommended</span></div>
        </div></div>
        <div class="context-preview"><div class="context-preview-header"><strong>What acceptance will do</strong><span class="permission-pill">Human action</span></div><dl><dt>Progress</dt><dd>Move the Mission to Done and resolve its context need</dd><dt>Company Memory</dt><dd>Create a human-verified decision</dd><dt>Claude</dt><dd>Close the session and revoke local capability</dd><dt>Team</dt><dd>Make the checked result available with its source trail</dd></dl></div>
      </div>
      <footer class="sheet-footer"><span class="source-pill">$1.18 · 11 min · 8 sources</span><div class="sheet-footer-actions"><button class="ghost-button" data-action="request-changes" type="button">Request changes</button><button class="primary-button" data-action="accept-outcome" type="button">Accept outcome</button></div></footer>
    `,
    "Review Outcome Bundle",
  );
}

function openHowWeKnow() {
  openSheet(
    `
      <header class="sheet-header"><div><h2>How we know</h2><p>The evidence behind this Mission’s current stage</p></div><button class="close-button" data-action="close-sheet" type="button" aria-label="Close">×</button></header>
      <div class="sheet-body" data-prototype-screen="how-we-know">
        <div class="context-preview"><div class="context-preview-header"><strong>Current understanding</strong><span class="permission-pill">${getMissionProgress().label}</span></div><p style="margin:0;color:var(--mist);font-size:10px;line-height:1.55">The team approved the native-first collaboration direction. Claude’s focused comparison and Astro’s review determine whether the Mission advances.</p></div>
        <div class="form-group" style="margin-top:16px"><div class="form-label">Supporting trail <span>Details stay out of the overview</span></div><div class="selection-list">
          <div class="selection-row"><span class="row-icon">#</span><span class="selection-copy"><strong>Product conversation</strong><span>Astro, Mona, and Thanh · today</span></span><span class="source-pill">Shared</span></div>
          <div class="selection-row"><span class="row-icon">✓</span><span class="selection-copy"><strong>Approved Horizon direction</strong><span>Human checked · current</span></span><span class="source-pill">Decision</span></div>
          <div class="selection-row"><span class="row-icon">✦</span><span class="selection-copy"><strong>Claude Work Session</strong><span>Scoped sources · owner Astro · resumable</span></span><span class="source-pill">Agent</span></div>
          <div class="selection-row"><span class="row-icon">D</span><span class="selection-copy"><strong>Staging response contract</strong><span>Provided by Thanh · updated today</span></span><span class="source-pill">Document</span></div>
        </div></div>
        <div class="context-preview"><div class="context-preview-header"><strong>Safety boundary</strong><span class="permission-pill">Visible to # product</span></div><dl><dt>Included</dt><dd>Selected channel context, approved decisions, staging contract</dd><dt>Excluded</dt><dd>Private DMs, secrets, unrelated repositories</dd><dt>Owner</dt><dd>Astro can pause, review, or stop the session</dd><dt>Completion</dt><dd>Only Astro’s acceptance can move this Mission to Done</dd></dl></div>
      </div>
      <footer class="sheet-footer"><span class="source-pill">Source trail preserved</span><div class="sheet-footer-actions"><button class="primary-button" data-action="close-sheet" type="button">Done</button></div></footer>
    `,
    "How we know",
  );
}

function openStateGallery() {
  const states = [
    ["empty", "Empty", "Direct people toward the next useful action."],
    ["loading", "Loading", "Restore spatial context, not an unexplained spinner."],
    ["active", "Active", "The live prototype and current canonical state."],
    ["blocked", "Blocked", "Name the dependency and offer the recovery action."],
    ["offline", "Offline", "Keep reading and drafting; pause shared actions."],
    ["permission-denied", "Permission denied", "Explain the boundary without leaking content."],
    ["provider-disconnected", "Provider disconnected", "Preserve checkpoint and revoke active tools."],
    ["failed", "Failed", "Show completed steps, evidence, and restart point."],
    ["paused", "Paused", "State is safe, resumable, and not still executing."],
    ["completed", "Completed", "Human-verified evidence, not agent assertion."],
    ["stale", "Stale", "Request review instead of guessing what happened."],
  ];

  openSheet(
    `<header class="sheet-header"><div><h2>Prototype lifecycle states</h2><p>Every critical state has clear meaning and recovery</p></div><button class="close-button" data-action="close-sheet" type="button" aria-label="Close">×</button></header><div class="sheet-body"><div class="state-gallery">${states
      .map(([id, label, description]) => `<button class="state-card" data-action="simulate-state" data-state="${id}" type="button"><span class="state-mark"></span><strong>${label}</strong><span>${description}</span></button>`)
      .join("")}</div></div><footer class="sheet-footer"><span class="source-pill">Keyboard · VoiceOver · reduced motion</span><div class="sheet-footer-actions"><button class="primary-button" data-action="close-sheet" type="button">Done</button></div></footer>`,
    "Prototype lifecycle states",
  );
}

function openCommand() {
  commandRoot.innerHTML = `
    <div class="command-backdrop" data-action="close-command" role="presentation">
      <section class="command-panel" role="dialog" aria-modal="true" aria-label="Navigate or ask Murror" data-command-panel>
        <div class="command-input-wrap"><span>⌘</span><input class="command-input" id="command-input" type="search" placeholder="Go anywhere or ask Murror…" autocomplete="off" /></div>
        <div class="command-results" id="command-results">${renderCommandResults(commandItems)}</div>
      </section>
    </div>
  `;
  const input = document.querySelector("#command-input");
  input?.focus();
  input?.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    const filtered = commandItems.filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query));
    document.querySelector("#command-results").innerHTML = renderCommandResults(filtered);
  });
}

function renderCommandResults(items) {
  if (!items.length) {
    return `<div class="empty-state" style="min-height:160px"><div class="empty-state-inner"><p>No matching conversation, mission, person, or knowledge.</p></div></div>`;
  }
  return items.map((item, index) => `<button class="command-result ${index === 0 ? "is-active" : ""}" data-screen="${item.screen}" type="button"><span class="progress-icon" style="width:28px;height:28px">${item.symbol}</span><span><strong>${item.label}</strong><small>${item.meta}</small></span><small>↵</small></button>`).join("");
}

function openNewChannel() {
  openSheet(
    `<header class="sheet-header"><div><h2>Create channel</h2><p>Start a durable topic with an explicit privacy boundary</p></div><button class="close-button" data-action="close-sheet" type="button">×</button></header><div class="sheet-body"><div class="form-group"><label class="form-label" for="channel-name">Channel name</label><input class="text-field" id="channel-name" value="customer-voice" /></div><div class="form-group"><label class="form-label" for="channel-purpose">Purpose</label><textarea class="text-area" id="channel-purpose">Customer evidence, patterns, and product implications.</textarea></div><div class="selection-list"><label class="selection-row"><input type="radio" name="visibility" checked /><span class="selection-copy"><strong>Public to My Murror</strong><span>Discoverable by the team</span></span></label><label class="selection-row"><input type="radio" name="visibility" /><span class="selection-copy"><strong>Private</strong><span>Only invited people and agents</span></span></label></div></div><footer class="sheet-footer"><span class="source-pill">Agents excluded until invited</span><div class="sheet-footer-actions"><button class="ghost-button" data-action="close-sheet" type="button">Cancel</button><button class="primary-button" data-action="create-channel" type="button">Create channel</button></div></footer>`,
    "Create channel",
  );
}

function openNewMessage() {
  openSheet(
    `<header class="sheet-header"><div><h2>New message</h2><p>Start a private conversation</p></div><button class="close-button" data-action="close-sheet" type="button">×</button></header><div class="sheet-body"><label class="form-label" for="people-search">People or agents</label><input class="text-field" id="people-search" value="Thanh" /><div class="selection-list" style="margin-top:10px"><button class="selection-row" data-action="start-dm" type="button">${avatar(people.thanh)}<span class="selection-copy"><strong>Thanh</strong><span>Available · teammate</span></span><span class="presence-dot"></span></button><button class="selection-row" data-screen="agent-private" type="button"><span class="person-avatar agent">C</span><span class="selection-copy"><strong>Claude</strong><span>Private agent conversation</span></span><span class="agent-glyph">✦</span></button></div></div>`,
    "New message",
  );
}

function simulateState(kind) {
  closeSheet();
  state.simulatedState = kind;
  connectionBanner.hidden = kind !== "offline";
  render();
}

document.addEventListener("click", (event) => {
  const screenTarget = event.target.closest("[data-screen]");
  if (screenTarget) {
    event.preventDefault();
    navigate(screenTarget.dataset.screen);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  const isBackdropAction = action === "close-sheet" || action === "close-command";
  if (isBackdropAction && event.target !== actionTarget) return;

  switch (action) {
    case "open-today": navigate("today"); break;
    case "open-states": openStateGallery(); break;
    case "open-command": openCommand(); break;
    case "close-sheet": closeSheet(); break;
    case "close-command": closeCommand(); break;
    case "start-claude": openStartWorkSession(); break;
    case "select-mode":
      state.selectedMode = actionTarget.dataset.mode;
      openStartWorkSession();
      break;
    case "begin-session":
      state.sessionStage = "needs-context";
      closeSheet();
      navigate("channel");
      toast("Claude started with Context Capsule v3. Private sources remain excluded.", "agent");
      break;
    case "refill-context": openRefillContext(); break;
    case "confirm-refill":
      state.sessionStage = "review";
      closeSheet();
      navigate("channel");
      toast("Context Capsule v4 shared with Claude. The source and scope were recorded.", "verified");
      break;
    case "review-outcome":
      if (state.sessionStage !== "review" && state.sessionStage !== "completed") {
        toast("The artifact is not ready yet. Refill the missing context first.", "danger");
      } else {
        openOutcomeReview();
      }
      break;
    case "accept-outcome":
      state.sessionStage = "completed";
      state.knowledgeVerified = true;
      closeSheet();
      navigate("mission-map");
      toast("Done and checked. Progress and Company Memory now share the same state.", "verified");
      break;
    case "request-changes":
      closeSheet();
      state.sessionStage = "needs-context";
      navigate("channel");
      toast("Changes requested. Claude returned to the preserved checkpoint.", "agent");
      break;
    case "pause-session":
    case "stop-session":
      state.sessionStage = "paused";
      render();
      toast(action === "stop-session" ? "Session stopped. Active local access was revoked." : "Session paused after the current step.", "agent");
      break;
    case "resume-session":
      state.sessionStage = "needs-context";
      render();
      toast("Claude resumed from checkpoint 2 with the same approved scope.", "agent");
      break;
    case "send-message": {
      const input = document.querySelector("#channel-message");
      const value = input?.value.trim();
      if (!value) {
        input?.focus();
        break;
      }
      state.customMessages.push(value.replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
      render();
      document.querySelector("#message-list")?.scrollTo({ top: 99999, behavior: "smooth" });
      toast("Message sent to # product.");
      break;
    }
    case "send-dm": toast("Private message sent to Thanh."); break;
    case "open-knowledge-detail": toast("Source trail opened: 3 conversations, 1 review, 1 current version."); break;
    case "how-we-know": openHowWeKnow(); break;
    case "filter-progress": toast(`${actionTarget.dataset.stage}: showing the same calm ledger, ordered by this stage.`); break;
    case "open-mission-preview": toast(`${actionTarget.dataset.mission}: detail view is represented by the Company Memory Mission in this milestone.`); break;
    case "ask-murror": openCommand(); break;
    case "new-channel": openNewChannel(); break;
    case "new-message": openNewMessage(); break;
    case "create-channel": closeSheet(); toast("# customer-voice created. Agents are excluded until invited.", "verified"); break;
    case "start-dm": closeSheet(); navigate("dm"); break;
    case "simulate-state": simulateState(actionTarget.dataset.state); break;
    case "return-live":
    case "restore-connection":
      state.simulatedState = "active";
      connectionBanner.hidden = true;
      render();
      toast("Live company state restored.", "verified");
      break;
    case "show-since-left": toast("Since You Left highlights 4 meaningful changes, not 126 unread messages."); break;
    case "new-mission": toast("Mission composer will preserve the channel and owner context."); break;
    case "convert-dm": toast("Only selected messages will move into the new private channel."); break;
    case "mark-reviewed": toast("Inbox reviewed. Future changes remain available in Since You Left."); break;
    case "start-call": toast("Voice and video are deferred from the first internal alpha."); break;
    case "connect-agent": toast("Additional agent providers are deferred until Claude is trusted end to end."); break;
    case "new-knowledge": toast("New knowledge begins as a proposal and requires human verification."); break;
    case "open-profile": toast("Astro · notification calm enabled · local bridge healthy."); break;
    case "channel-members": toast("6 teammates · Claude installed with scoped product access."); break;
    case "send-first-message": navigate("channel"); break;
    default: toast("This prototype control is intentionally non-destructive.");
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommand();
  }
  if (event.key === "Escape") {
    closeSheet();
    closeCommand();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    const active = document.activeElement;
    if (active?.id === "channel-message") document.querySelector('[data-action="send-message"]')?.click();
  }
});

render();
