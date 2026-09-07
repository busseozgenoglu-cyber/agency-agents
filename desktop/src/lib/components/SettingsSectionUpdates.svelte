<script lang="ts">
  import { onMount } from "svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { appVersion } from "$lib/api";
  import { safeOpenUrl } from "$lib/util/url";

  const REPO_URL = "https://github.com/busseozgenoglu-cyber/agency-agents";
  let version = $state<string | null>(null);
  let versionError = $state(false);

  onMount(() => {
    void appVersion()
      .then((value) => (version = value))
      .catch(() => (versionError = true));
  });
</script>

<section class="section" aria-labelledby="personalized-updates-title">
  <h2 id="personalized-updates-title">Buse’ye özel sürüm</h2>
  <div class="build-info">
    <span class="field-label">Buse’nin Ajansı</span>
    <span class="version">
      {#if version}Sürüm {version}{:else if versionError}Sürüm bilgisi alınamadı{:else}Sürüm yükleniyor…{/if}
    </span>
  </div>
  <p class="hint">
    Bu uygulama senin ajans panelin ve personel kütüphanen için özelleştirildi.
    Kişiselleştirmelerini korumak için otomatik güncelleme ve standart uygulama
    güncellemeleri kapalıdır.
  </p>
  <p class="hint">
    Yeni masaüstü özellikleri için kişisel sürümün yeniden derlenip kurulması gerekir.
    Ajans panelindeki web güncellemeleri ise paneli yeniden açtığında görünür.
  </p>
  <button class="repo-link" type="button" onclick={() => void safeOpenUrl(REPO_URL)}>
    Kişisel projenin GitHub sayfasını aç
    <ExternalLink size={14} aria-hidden="true" />
  </button>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 580px;
    margin-top: var(--space-3);
    padding-top: var(--space-5);
    border-top: 1px solid var(--color-border);
  }
  h2 {
    font-size: var(--text-h2);
    font-weight: var(--fw-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-2);
  }
  .build-info {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  .field-label {
    font-size: var(--text-body);
    font-weight: var(--fw-medium);
    color: var(--color-text-primary);
  }
  .version {
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    color: var(--color-text-muted);
  }
  .hint {
    margin: 0;
    font-size: var(--text-body-sm);
    line-height: 1.65;
    color: var(--color-text-muted);
  }
  .repo-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    align-self: flex-start;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text-link);
    font-size: var(--text-body-sm);
    font-weight: var(--fw-medium);
    cursor: pointer;
  }
  .repo-link:hover { background: var(--color-surface); }
  .repo-link:focus-visible {
    outline: 2px solid var(--color-text-link);
    outline-offset: 3px;
  }
</style>
