<script lang="ts">
  /**
   * Agency Dashboard — the at-a-glance overview. Four rollup stats, then the
   * charts: install-health donut, coverage-by-tool bars, the cross-tool coverage
   * matrix (category × tool), and the catalog's category distribution. Every
   * surface deep-links into the Agents workspace (with the matching filter) or
   * the Tools view. All charts are dependency-free (SVG + CSS).
   */
  import { onMount } from "svelte";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import RepoIcon from "@lucide/svelte/icons/git-branch";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Users from "@lucide/svelte/icons/users";
  import Bot from "@lucide/svelte/icons/bot";
  import Wrench from "@lucide/svelte/icons/wrench";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { corpus } from "$lib/stores/corpus.svelte";
  import { install, SUPPORTED_TOOLS } from "$lib/stores/install.svelte";
  import { projects } from "$lib/stores/projects.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { toolAccent, toolLabel } from "$lib/data/toolRegistry";
  import HealthDonut from "./HealthDonut.svelte";
  import CoverageDonuts from "./CoverageDonuts.svelte";
  import CatalogByDivision from "./CatalogByDivision.svelte";
  import InstallSunburst from "./InstallSunburst.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import type { InstalledAgent } from "$lib/types";

  // This handoff always opens Buse's own panel, never a URL from catalog data.
  const PANEL_URL = "https://busenin-ajansi.ozgenoglubuse.chatgpt.site/";
  let openingPanel = $state(false);
  async function openAgency() {
    if (openingPanel) return;
    openingPanel = true;
    try {
      await openUrl(PANEL_URL);
    } catch (error) {
      toast.error("Ajans paneli açılamadı", `Tarayıcından ${PANEL_URL} adresini açabilirsin. ${String(error)}`);
    } finally {
      openingPanel = false;
    }
  }

  const guideSteps = [
    { title: "Fikrini anlat", body: "Ne üretmek istediğini, hedefini ve beklentilerini panelde yaz." },
    { title: "Ekibini seç", body: "Uzman personellerden ekibini kur veya kendi personelini ekle." },
    { title: "Birlikte geliştirin", body: "Personellerin önerilerini ve birbirlerine verdikleri yorumları takip et." },
    { title: "Sunumunu al", body: "Ekibin katkılarından oluşan proje sunumunu panelde incele." },
  ];

  // Pure reader — install state loaded globally in +layout.
  onMount(() => {
    corpus.ensureLoaded();
    projects.refresh();
    // Local-only reads (no network): learn whether the active catalog is a
    // git clone we maintain, so the "Update from GitHub" control can appear.
    void catalog.load().then(() => catalog.loadStatus());
  });

  // ── "Update from GitHub" — only when the active catalog is a git clone we're
  //    allowed to pull (managed ~/.agency-agents, or a user clone with manage
  //    permission). Bundled/snapshot and read-only clones show nothing. ──
  const catalogReadOnly = $derived(
    catalog.source.kind === "userClone" && !catalog.source.manage,
  );
  const showCatalogUpdate = $derived(!!catalog.status?.isGit && !catalogReadOnly);
  const catalogRepo = $derived(catalog.status?.repoSlug ?? null);

  async function updateCatalog() {
    if (catalog.busy) return;
    try {
      await catalog.pull();
      toast.success(i18n.t("dashboard.catalogUpdated"));
    } catch (e) {
      toast.error(i18n.t("common.actionFailed"), String(e));
    }
  }

  const available = $derived(corpus.agents.length);
  const managed = $derived(install.installed.filter((i) => i.state !== "foreign").length);
  // Of that present-on-disk total, how many THIS app installed (ledger-tracked)
  // vs. picked up from elsewhere (a prior CLI `install.sh` run, byte-matched).
  const trackedByApp = $derived(install.installed.filter((i) => i.tracked && i.state !== "foreign").length);
  const fromOtherTools = $derived(managed - trackedByApp);
  const attention = $derived(
    install.installed.filter((i) => ["outdated", "modified", "removed"].includes(i.state)).length,
  );
  const foreign = $derived(install.installed.filter((i) => i.state === "foreign").length);
  const totalInstalls = $derived(install.installed.length);

  // ── Install-health donut (every install row, split by reconciled state) ──
  const byState = $derived.by(() => {
    const c = { current: 0, outdated: 0, modified: 0, foreign: 0, removed: 0 };
    for (const i of install.installed) c[i.state]++;
    return c;
  });
  const healthSegments = $derived([
    { label: i18n.t("state.current"),   value: byState.current,  color: "var(--color-success)", onClick: () => ui.openAgents(null, "current") },
    { label: i18n.t("state.outdated"),  value: byState.outdated,  color: "var(--color-warning)", onClick: () => ui.openAgents(null, "outdated") },
    { label: i18n.t("state.modified"),  value: byState.modified,  color: "color-mix(in srgb, var(--color-warning) 55%, var(--color-danger))", onClick: () => ui.openAgents(null, "outdated") },
    { label: i18n.t("state.foreign"), value: byState.foreign,   color: "var(--color-brand)",   onClick: () => ui.openAgents(null, "foreign") },
    { label: i18n.t("state.removed"),   value: byState.removed,   color: "var(--color-danger)",  onClick: () => ui.openAgents(null, "removed") },
  ]);

  // ── Coverage by tool — only tools that actually hold agents (less noise) ──
  const perTool = $derived(
    SUPPORTED_TOOLS.map((t) => ({
      id: t.id,
      label: t.label,
      count: install.installed.filter((i) => i.tool === t.id).length,
      detected: install.tools.find((x) => x.tool === t.id)?.detected ?? false,
    })).filter((t) => t.count > 0),
  );
  const maxTool = $derived(Math.max(1, ...perTool.map((t) => t.count)));

  // Shared division highlight for the merged "Cross-tool coverage" card: the
  // per-tool donuts and the catalog-by-division bar light the same division.
  let divisionHover = $state<string | null>(null);

  // ── "Installed by you": two-ring donut — Global vs Projects, broken down by
  //    tool / by project on the outer ring. Uses the same `managed` set as the
  //    stat so the numbers reconcile. ──
  const managedRows = $derived(install.installed.filter((i) => i.state !== "foreign"));
  const globalRows = $derived(managedRows.filter((i) => i.projectPath == null));
  const projectRows = $derived(managedRows.filter((i) => i.projectPath != null));

  function basename(p: string): string {
    return p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;
  }
  // Distinct-but-cohesive hue per project (golden-angle spacing).
  function projectColor(i: number): string {
    return `hsl(${(i * 137.508 + 25) % 360} 60% 55%)`;
  }

  const globalByTool = $derived.by(() => {
    const m = new Map<string, number>();
    for (const r of globalRows) m.set(r.tool, (m.get(r.tool) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, value]) => ({ label: toolLabel(id), value, color: toolAccent(id), onClick: () => ui.openTools(id) }));
  });
  const projByProject = $derived.by(() => {
    const m = new Map<string, number>();
    for (const r of projectRows) m.set(r.projectPath!, (m.get(r.projectPath!) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([path, value], i) => ({ label: basename(path), value, color: projectColor(i), onClick: () => ui.selectProject(path) }));
  });
  const sunburstGroups = $derived([
    { label: i18n.t("dashboard.global"), value: globalRows.length, color: "var(--color-brand)", onClick: () => ui.setSection("tools"), children: globalByTool },
    { label: i18n.t("dashboard.projects"), value: projectRows.length, color: "var(--color-success)", onClick: () => ui.setSection("projects"), children: projByProject },
  ]);

  // ── Projects list with per-division breakdown (project-scoped installs). ──
  const slugCat = $derived(new Map(corpus.agents.map((a) => [a.slug, a.category])));
  const projectBreakdown = $derived.by(() => {
    const byPath = new Map<string, InstalledAgent[]>();
    for (const r of projectRows) {
      const arr = byPath.get(r.projectPath!);
      if (arr) arr.push(r);
      else byPath.set(r.projectPath!, [r]);
    }
    return [...byPath.entries()]
      .map(([path, rows]) => {
        const divs = new Map<string, number>();
        for (const r of rows) {
          const c = slugCat.get(r.slug) ?? "uncategorized";
          divs.set(c, (divs.get(c) ?? 0) + 1);
        }
        const divisions = [...divs.entries()]
          .map(([slug, count]) => ({ slug, label: corpus.labelOf(slug), color: corpus.colorOf(slug), count }))
          .sort((a, b) => b.count - a.count);
        return { path, label: basename(path), total: rows.length, divisions };
      })
      .sort((a, b) => b.total - a.total);
  });
</script>

<section class="dash">
  <div class="welcome-row">
    <div><span class="eyebrow">BUSE’NİN AJANSI</span><p>Hoş geldin, Buse <span aria-hidden="true">✳</span></p></div>
    <span class="personal-note">Senin vizyonun, birlikte üretim.</span>
  </div>

  <section class="agency-hero" aria-labelledby="agency-title">
    <div class="hero-copy">
      <span class="hero-kicker"><Sparkles size={16} aria-hidden="true" /> FİKİRLERİNİN YENİ EVİ</span>
      <h1 id="agency-title">Fikirlerin için bir ekip,<br /><em>senin için bir ajans.</em></h1>
      <p class="hero-description">Aklındaki fikre yer aç. Kendi yapay zekâ ekibini kur; birlikte düşünün, geliştirin, ortaya güzel bir iş çıkarın.</p>
      <button class="agency-primary" onclick={openAgency} disabled={openingPanel} aria-describedby="panel-note">
        {openingPanel ? "Panel açılıyor…" : "Ajansımı aç"}<ArrowUpRight size={19} aria-hidden="true" />
      </button>
      <p class="panel-note" id="panel-note">Personel ekleme, ekip çalışmaları ve sunumlar özel web panelinde. Panel tarayıcında açılır.</p>
    </div>
    <div class="hero-art" aria-hidden="true">
      <span class="art-spark spark-one">✳</span><span class="art-spark spark-two">✦</span>
      <div class="idea-card"><span class="idea-label">YARATICI YÖNETMEN</span><span class="idea-name">Buse.</span><span class="idea-line"></span><span class="idea-message">Bir fikirle başlar.<br />Seninle şekillenir.</span><span class="idea-signature">senin ajansın ♡</span></div>
      <span class="art-caption">FİKİRLERİNE İYİ GELEN EKİP</span>
    </div>
  </section>

  <section class="how-to" aria-labelledby="how-title">
    <div class="section-heading"><div><span class="eyebrow">BAŞLAMAK ÇOK KOLAY</span><h2 id="how-title">Nasıl kullanılır?</h2></div><span class="guide-label">Fikirden sunuma, dört adım.</span></div>
    <ol class="guide-steps">
      {#each guideSteps as step, index (step.title)}
        <li><span class="step-number" aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></li>
      {/each}
    </ol>
    <p class="guide-note">Gerçek ekip çalışması için panelde OpenAI bağlantısının hazır olması gerekir. Çalışma ilerlerken panel sekmesini açık tut.</p>
  </section>

  <section class="desktop-tools" aria-labelledby="desktop-title">
    <div class="section-heading"><div><span class="eyebrow">MASAÜSTÜNDE DE YANINDAYIZ</span><h2 id="desktop-title">Personellerin ve araçların</h2></div></div>
    <div class="quick-links">
      <button onclick={() => ui.openAgents()}><span class="quick-icon"><Bot size={21} aria-hidden="true" /></span><span><strong>Personel kataloğu</strong><small>{available} personeli keşfet</small></span><ArrowRight size={17} aria-hidden="true" /></button>
      <button onclick={() => ui.setSection("teams")}><span class="quick-icon lilac"><Users size={21} aria-hidden="true" /></span><span><strong>Masaüstü ekipleri</strong><small>Kayıtlı personel gruplarını yönet</small></span><ArrowRight size={17} aria-hidden="true" /></button>
      <button onclick={() => ui.setSection("tools")}><span class="quick-icon cream"><Wrench size={21} aria-hidden="true" /></span><span><strong>Yapay zekâ araçları</strong><small>Kurulumlarını ve araçlarını gör</small></span><ArrowRight size={17} aria-hidden="true" /></button>
    </div>
  </section>

  <details class="catalog-details">
    <summary><span>Katalog ve kurulum ayrıntıları</span><span class="details-hint">İstatistikler, dağılımlar ve güncellemeler</span></summary>
    <div class="details-content">
  {#if showCatalogUpdate}
    <div class="cat-bar">
      <span class="cat-info">
        <RepoIcon size={15} />
        <span class="cat-repo">{catalogRepo ?? i18n.t("dashboard.catalogGitHub")}</span>
        {#if catalog.updateCheck && !catalog.updateCheck.upToDate && catalog.updateCheck.behind > 0}
          <span class="cat-behind">{i18n.t("dashboard.catalogBehind", { count: catalog.updateCheck.behind })}</span>
        {/if}
      </span>
      <button
        class="cat-btn"
        disabled={catalog.busy}
        onclick={updateCatalog}
        title={catalogRepo ? i18n.t("dashboard.catalogManagedFrom", { repo: catalogRepo }) : undefined}
      >
        <RefreshCw size={14} class={catalog.busy ? "cat-spin" : ""} />
        <span>{catalog.busy ? i18n.t("common.working") : i18n.t("dashboard.updateFromGitHub")}</span>
      </button>
    </div>
  {/if}
  <div class="stats">
    <button class="stat" onclick={() => ui.openAgents()}>
      <span class="s-num">{available}</span>
      <span class="s-lbl">{i18n.t("dashboard.agentsAvailable")}</span>
    </button>
    <button class="stat" onclick={() => ui.openAgents()}>
      <span class="s-num">{managed}</span>
      <span class="s-lbl">{i18n.t("dashboard.totalInstalled")}</span>
      {#if fromOtherTools > 0}
        <span class="s-sub">{i18n.t("dashboard.viaThisApp", { tracked: trackedByApp, other: fromOtherTools })}</span>
      {/if}
    </button>
    {#if attention > 0}
      <button class="stat warn" onclick={() => ui.openAgents(null, "attention")}>
        <span class="s-num">{attention}</span>
        <span class="s-lbl">{i18n.t("dashboard.needAttention")}</span>
      </button>
    {/if}
    {#if foreign > 0}
      <button class="stat info" onclick={() => ui.openAgents(null, "foreign")}>
        <span class="s-num">{foreign}</span>
        <span class="s-lbl">{i18n.t("dashboard.foundToTrack")}</span>
      </button>
    {/if}
  </div>

  <div class="cols">
    <div class="card">
      <h3 class="c-title">{i18n.t("dashboard.totalInstalled")}</h3>
      <div class="card-fill center">
        {#if managed === 0}
          <p class="muted">{i18n.t("dashboard.emptyInstalled")}</p>
        {:else}
          <InstallSunburst groups={sunburstGroups} />
        {/if}
      </div>
    </div>

    <div class="card">
      <h3 class="c-title">{i18n.t("dashboard.projects")}</h3>
      <div class="card-fill">
        {#if projectBreakdown.length === 0}
        <p class="muted">
          {i18n.t("dashboard.noProjectInstalls")}
          <button class="link inline" onclick={() => ui.setSection("projects")}>{i18n.t("dashboard.openProjects")}</button>
        </p>
      {:else}
        <ul class="proj-list">
          {#each projectBreakdown as p (p.path)}
            <li>
              <button class="proj-row" onclick={() => ui.selectProject(p.path)} title={p.path}>
                <span class="proj-top">
                  <span class="proj-name">{p.label}</span>
                  <span class="proj-total">{i18n.count(p.total, "common.agent.one", "common.agent.many")}</span>
                </span>
                <span class="proj-bar">
                  {#each p.divisions as d (d.slug)}
                    <span class="proj-seg" style="flex:{d.count};background:{d.color}" title="{d.label}: {d.count}"></span>
                  {/each}
                </span>
                <span class="proj-divs">
                  {#each p.divisions.slice(0, 4) as d (d.slug)}
                    <span class="proj-div"><span class="pd-dot" style="background:{d.color}"></span>{d.label} {d.count}</span>
                  {/each}
                  {#if p.divisions.length > 4}<span class="proj-div more">{i18n.t("dashboard.moreDivisions", { count: p.divisions.length - 4 })}</span>{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      </div>
    </div>
  </div>

  <div class="cols">
    <div class="card">
      <h3 class="c-title">{i18n.t("dashboard.installHealth")}</h3>
      <div class="card-fill center">
        {#if totalInstalls === 0}
          <p class="muted">{i18n.t("dashboard.emptyHealth")}</p>
        {:else}
          <HealthDonut segments={healthSegments} />
        {/if}
      </div>
    </div>

    <div class="card">
      <h3 class="c-title">{i18n.t("dashboard.coverageByTool")}</h3>
      <div class="card-fill">
        {#if perTool.length === 0}
        <p class="muted">{i18n.t("dashboard.emptyToolCoverage")}</p>
      {:else}
        <ul class="bars">
          {#each perTool as t (t.id)}
            <li>
              <button class="bar-btn" onclick={() => ui.openTools(t.id)} title={t.detected ? i18n.t("dashboard.toolDetectedTitle") : i18n.t("dashboard.toolNotDetectedTitle")}>
                <span class="tool-dot" class:off={!t.detected}></span>
                <span class="bar-label">{t.label}</span>
                <span class="bar-track"><span class="bar-fill" style="width:{(t.count / maxTool) * 100}%"></span></span>
                <span class="bar-count">{t.count}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      </div>
      <button class="link" onclick={() => ui.setSection("tools")}>{i18n.t("dashboard.manageTools")}</button>
    </div>
  </div>

  <div class="card">
    <h3 class="c-title">{i18n.t("dashboard.crossToolCoverage")}</h3>
    <CoverageDonuts bind:hovered={divisionHover} />
    <div class="merge-sep">
      <span class="merge-cap">{i18n.t("dashboard.catalogByDivision")}</span>
    </div>
    <CatalogByDivision bind:hovered={divisionHover} />
  </div>
    </div>
  </details>
  <footer class="agency-footer"><span>Buse’nin Ajansı <span aria-hidden="true">✦</span></span><span>Büyük fikirler, güzel bir ekiple başlar.</span></footer>
</section>

<style>
  .dash { height: 100%; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 28px; container-type: inline-size; background: radial-gradient(ellipse at 95% 0%, var(--color-agency-lilac), transparent 55%), var(--color-surface); }
  .dash > * { flex-shrink: 0; }
  .welcome-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .eyebrow { display: block; color: var(--color-text-muted); font-size: 10px; font-weight: var(--fw-semibold); letter-spacing: 1.7px; line-height: 1.6; }
  .welcome-row p { font-size: 22px; font-weight: var(--fw-semibold); letter-spacing: -.6px; margin-top: 6px; }
  .welcome-row p > span { color: var(--color-brand); margin-left: 7px; font-size: 25px; }
  .personal-note { font-size: 11px; color: var(--color-text-muted); text-align: right; }
  .agency-hero { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(180px, .7fr); border: 1px solid var(--color-border); border-radius: 24px; padding: 34px; gap: 20px; background: linear-gradient(120deg, var(--color-surface-raised), var(--color-agency-cream)); box-shadow: var(--shadow-xs); overflow: hidden; }
  .hero-copy { min-width: 0; position: relative; z-index: 1; }
  .hero-kicker { display: flex; align-items: center; gap: 8px; color: var(--color-brand); font-size: 10px; font-weight: var(--fw-semibold); letter-spacing: 1.2px; margin-bottom: 18px; }
  .hero-copy h1 { font-size: clamp(28px, 4.3cqw, 45px); font-weight: 600; line-height: 1.2; letter-spacing: -1.5px; }
  .hero-copy h1 em { display: inline-block; color: var(--color-brand); font-family: Georgia, serif; font-weight: 400; }
  .hero-description { margin-top: 18px; max-width: 440px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.75; }
  .agency-primary { display: inline-flex; align-items: center; gap: 13px; background: var(--color-brand); color: var(--color-text-inverse); min-height: 46px; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: var(--fw-semibold); margin-top: 24px; transition: background-color var(--motion-duration-fast); }
  .agency-primary:hover:not(:disabled) { background: var(--color-brand-hover); }
  .agency-primary:disabled { opacity: .7; }
  .panel-note { margin-top: 12px; color: var(--color-text-muted); font-size: 11px; line-height: 1.65; max-width: 350px; }
  .hero-art { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; min-width: 0; padding: 20px 3px; }
  .hero-art::before { content: ''; width: 210px; height: 210px; border-radius: 50%; background: var(--color-agency-lilac); position: absolute; top: 12%; right: -45px; }
  .idea-card { position: relative; display: flex; flex-direction: column; width: 100%; max-width: 208px; padding: 27px 22px 20px; background: var(--color-brand-subtle); border: 1px solid var(--color-border-strong); border-radius: 14px; box-shadow: 8px 10px 0 var(--color-agency-lilac); transform: rotate(5deg); }
  .idea-label { color: var(--color-text-secondary); font-size: 8px; letter-spacing: 1.3px; font-weight: var(--fw-semibold); }
  .idea-name { font: italic 57px/1.15 Georgia, serif; letter-spacing: -3px; color: var(--color-brand); margin: 11px 0; }
  .idea-line { height: 1px; width: 30px; background: var(--color-brand); margin: 4px 0 16px; }
  .idea-message { font-size: 13px; line-height: 1.6; color: var(--color-text-primary); }
  .idea-signature { font: italic 15px/1.3 Georgia, serif; color: var(--color-brand); margin-top: 23px; }
  .art-spark { color: var(--color-brand); position: absolute; z-index: 1; line-height: 1; }
  .spark-one { top: 5px; left: -11px; font-size: 49px; transform: rotate(15deg); }
  .spark-two { bottom: 22px; right: -9px; font-size: 38px; }
  .art-caption { position: relative; font-size: 8px; letter-spacing: 1.25px; color: var(--color-text-muted); margin-top: 27px; }
  .section-heading { display: flex; justify-content: space-between; align-items: end; gap: 15px; margin-bottom: 17px; }
  .section-heading h2 { font-size: 19px; margin-top: 5px; letter-spacing: -.4px; }
  .guide-label { font-size: 11px; color: var(--color-text-muted); }
  .guide-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .guide-steps li { padding: 18px 15px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface-raised); }
  .step-number { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 10px; background: var(--color-brand-subtle); color: var(--color-brand); font-size: 11px; font-weight: var(--fw-bold); margin-bottom: 15px; }
  .guide-steps li:nth-child(2n) .step-number { background: var(--color-agency-lilac); }
  .guide-steps h3 { font-size: 13px; line-height: 1.4; margin-bottom: 7px; }
  .guide-steps p { font-size: 11px; line-height: 1.7; color: var(--color-text-secondary); }
  .guide-note { margin-top: 12px; font-size: 11px; line-height: 1.65; color: var(--color-text-muted); }
  .quick-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .quick-links button { display: flex; gap: 10px; align-items: center; padding: 16px 12px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface-raised); text-align: left; min-width: 0; }
  .quick-links button:hover { border-color: var(--color-brand); }
  .quick-links button > span:nth-child(2) { min-width: 0; flex: 1; }
  .quick-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border-radius: 12px; color: var(--color-brand); background: var(--color-brand-subtle); }
  .quick-icon.lilac { background: var(--color-agency-lilac); }
  .quick-icon.cream { background: var(--color-agency-cream); }
  .quick-links strong { display: block; font-size: 12px; line-height: 1.5; font-weight: var(--fw-semibold); }
  .quick-links small { display: block; font-size: 10px; line-height: 1.6; color: var(--color-text-muted); margin-top: 3px; }
  .quick-links button > :global(svg) { flex: none; color: var(--color-text-muted); }
  .catalog-details { border: 1px solid var(--color-border); border-radius: 15px; background: var(--color-surface-raised); }
  .catalog-details summary { padding: 18px; cursor: pointer; font-weight: var(--fw-semibold); font-size: 13px; border-radius: 15px; }
  .catalog-details summary::marker { color: var(--color-brand); }
  .details-hint { display: block; font-size: 11px; font-weight: var(--fw-regular); color: var(--color-text-muted); margin: 5px 0 0 16px; }
  .details-content { display: flex; flex-direction: column; gap: 16px; padding: 0 16px 16px; }
  .agency-footer { display: flex; justify-content: space-between; gap: 15px; padding: 0 2px 2px; color: var(--color-text-muted); font-size: 10px; }
  .agency-footer > span:first-child { font-weight: var(--fw-semibold); }
  .agency-footer > span > span { color: var(--color-brand); margin-left: 5px; }
  @container (max-width: 650px) {
    .agency-hero { grid-template-columns: minmax(0, 1fr) 170px; padding: 26px; gap: 14px; }
    .hero-copy h1 { font-size: 30px; }
    .hero-description { font-size: 13px; }
    .idea-card { padding: 22px 17px; }
    .idea-name { font-size: 51px; }
    .guide-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .quick-links { grid-template-columns: 1fr; }
    .quick-links button { padding: 14px 16px; }
    .guide-label { display: none; }
  }
  @container (max-width: 490px) {
    .agency-hero { grid-template-columns: minmax(0, 1fr); }
    .hero-art { display: none; }
    .personal-note { display: none; }
    .agency-footer { flex-wrap: wrap; }
    .cat-bar { align-items: flex-start; flex-direction: column; }
  }
  @media (max-width: 900px) { .dash { padding: 22px; gap: 24px; } }

  /* ── "Update from GitHub" bar (only when the catalog is a managed git clone) ── */
  .cat-bar {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    background: var(--color-surface-raised);
  }
  .cat-info { display: flex; align-items: center; gap: var(--space-2); min-width: 0; color: var(--color-text-secondary); font-size: var(--text-body-sm); }
  .cat-repo { font-family: var(--font-mono, ui-monospace, monospace); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cat-behind { flex: none; font-size: var(--text-caption); font-weight: var(--fw-semibold); color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 15%, transparent); padding: 1px 7px; border-radius: var(--radius-full); }
  .cat-btn {
    display: inline-flex; align-items: center; gap: 6px; flex: none;
    height: 30px; padding: 0 var(--space-3);
    border: 1px solid transparent; border-radius: var(--radius-md);
    background: var(--color-brand); color: var(--color-text-inverse);
    font-size: var(--text-body-sm); cursor: pointer;
  }
  .cat-btn:hover:not(:disabled) { filter: brightness(1.08); }
  .cat-btn:disabled { opacity: 0.6; cursor: default; }
  :global(.cat-spin) { animation: cat-spin 0.7s linear infinite; }
  @keyframes cat-spin { to { transform: rotate(360deg); } }

  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); }
  .stat {
    display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
    padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    background: var(--color-surface-raised); cursor: pointer; text-align: left;
  }
  .stat:hover { border-color: var(--color-brand); }
  .s-num { font-size: 30px; font-weight: var(--fw-bold); color: var(--color-text-primary); line-height: 1; }
  .s-lbl { font-size: var(--text-body-sm); color: var(--color-text-muted); }
  .s-sub { font-size: 11px; color: var(--color-text-muted); opacity: 0.85; margin-top: 3px; }
  .stat.warn .s-num { color: var(--color-warning); }
  .stat.info .s-num { color: var(--color-info, var(--color-brand)); }

  /* Cards in a row stretch to equal height (default grid behavior) so neighbours
     never leave a dangling gap; their content fills via `.card-fill`. */
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); align-items: stretch; }
  @media (max-width: 820px) { .cols { grid-template-columns: 1fr; } }
  .card {
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    background: var(--color-surface-raised); padding: var(--space-4); min-width: 0;
    display: flex; flex-direction: column;
  }
  .c-title { flex: none; font-size: var(--text-body-sm); font-weight: var(--fw-semibold); color: var(--color-text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.04em; }
  /* The body claims the leftover height. `.center` vertically centers a chart so
     a short donut sits balanced in a tall card instead of hugging the title. */
  .card-fill { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .card-fill.center { justify-content: center; }
  .muted { color: var(--color-text-muted); font-size: var(--text-body-sm); }

  /* ── Generic bar list (coverage-by-tool) ── */
  .bars { display: flex; flex-direction: column; gap: 2px; }
  .bar-btn {
    display: flex; align-items: center; gap: var(--space-2); width: 100%;
    padding: 6px var(--space-2); border-radius: var(--radius-sm);
    background: transparent; cursor: pointer; text-align: left;
  }
  .bar-btn:hover { background: var(--color-surface-sunken); }
  .bar-label { width: 116px; font-size: var(--text-body-sm); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: none; }
  .bar-track { flex: 1; height: 6px; background: var(--color-surface-sunken); border-radius: var(--radius-full); overflow: hidden; min-width: 24px; }
  .bar-fill { display: block; height: 100%; background: var(--color-brand); border-radius: var(--radius-full); }
  .bar-count { width: 30px; text-align: right; font-size: var(--text-caption); color: var(--color-text-muted); font-variant-numeric: tabular-nums; flex: none; }

  .tool-dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-success); flex: none; }
  .tool-dot.off { background: var(--color-text-muted); opacity: 0.5; }

  .link { background: transparent; color: var(--color-brand); font-size: var(--text-body-sm); cursor: pointer; padding: 0; margin-top: var(--space-3); }
  .link.inline { margin-top: 0; }
  .link:hover { text-decoration: underline; }

  /* ── Projects list with per-division breakdown ── */
  .proj-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .proj-row {
    display: flex; flex-direction: column; gap: 6px; width: 100%;
    padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
    background: transparent; cursor: pointer; text-align: left;
  }
  .proj-row:hover { background: var(--color-surface-sunken); }
  .proj-top { display: flex; align-items: baseline; gap: var(--space-2); }
  .proj-name { flex: 1; min-width: 0; font-size: var(--text-body-sm); font-weight: var(--fw-semibold); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .proj-total { flex: none; font-size: var(--text-caption); color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  .proj-bar { display: flex; height: 7px; border-radius: var(--radius-full); overflow: hidden; background: var(--color-surface-sunken); }
  .proj-seg { display: block; min-width: 2px; }
  .proj-divs { display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .proj-div { display: inline-flex; align-items: center; gap: 5px; font-size: var(--text-caption); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
  .proj-div.more { color: var(--color-text-muted); }
  .pd-dot { width: 7px; height: 7px; border-radius: 999px; flex: none; }

  /* Separator between the donuts and the catalog-by-division bar (the merged
     card's division reference). A hairline with a small inset caption. */
  .merge-sep {
    display: flex; align-items: center; gap: var(--space-2);
    margin: var(--space-4) 0 var(--space-2);
  }
  .merge-sep::after { content: ""; flex: 1; height: 1px; background: var(--color-border); }
  .merge-cap { font-size: var(--text-caption); font-weight: var(--fw-semibold); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
</style>
