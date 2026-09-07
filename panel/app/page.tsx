'use client';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  LayoutDashboard,
  Users,
  FolderOpen,
  BookOpen,
  Settings,
  ArrowRight,
  Heart,
  Search,
  Check,
  X,
  Play,
  Pause,
  Download,
  ArrowLeft,
  MessageSquare,
  Presentation,
  Lightbulb,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import catalog from '@/data/catalog.json';
import divisions from '@/data/divisions.json';
import type { Agent, Message, Project, Snapshot } from '@/lib/types';

type View = 'home' | 'agents' | 'projects' | 'guide' | 'settings' | 'room';
const nav = [
  { icon: LayoutDashboard, label: 'Ajansım', id: 'home' },
  { icon: Users, label: 'Yapay Zekâ Personelleri', id: 'agents' },
  { icon: FolderOpen, label: 'Projelerim', id: 'projects' },
  { icon: BookOpen, label: 'Nasıl Kullanılır?', id: 'guide' },
] as const;
const statusLabels: Record<Project['status'], string> = {
  queued: 'Başlamaya hazır',
  running: 'Ekip çalışıyor',
  paused: 'Duraklatıldı',
  completed: 'Sunum hazır',
  error: 'İlgi bekliyor',
};
const phaseLabels = {
  proposal: 'İlk öneri',
  review: 'Ekip değerlendirmesi',
  presentation: 'Ortak sunum',
};
const category = (id: string) =>
  id === 'custom'
    ? 'Kendi Personelim'
    : (divisions as Record<string, string>)[id] || id;
async function api<T>(body?: Record<string, unknown>, query = ''): Promise<T> {
  const response = await fetch(
    '/api/agency' + query,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' },
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Ajansa bağlanılamadı. Lütfen sayfayı yenileyin.');
  }
  if (!response.ok)
    throw new Error(
      (result as { error?: string }).error || 'İşlem tamamlanamadı.',
    );
  return result as T;
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        b<span>✦</span>
      </span>
      <div>
        Buse’nin
        <strong>
          Ajansı<span aria-hidden="true">✦</span>
        </strong>
      </div>
    </div>
  );
}
function Navigation({
  view,
  go,
  configured,
}: {
  view: View;
  go: (v: View) => void;
  configured: boolean;
}) {
  const { setOpenMobile } = useSidebar();
  const navigate = (v: View) => {
    go(v);
    setOpenMobile(false);
  };
  return (
    <Sidebar className="agency-sidebar">
      <SidebarHeader className="agency-sidebar-header">
        <Brand />
        <div className="workspace-label">BUSE’NİN ÇALIŞMA ALANI</div>
      </SidebarHeader>
      <SidebarContent className="agency-sidebar-content">
        <SidebarMenu>
          {nav.map(({ icon: Icon, label, id }) => (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                className="agency-nav-button"
                isActive={view === id || (view === 'room' && id === 'projects')}
                onClick={() => navigate(id)}
              >
                <Icon />
                {label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="agency-sidebar-footer">
        <div className="sidebar-note">
          <Sparkles />
          <strong>
            Büyük fikirler,
            <br />
            güzel bir ekiple başlar.
          </strong>
          <span>Bu ajansın yaratıcı yönetmeni sensin.</span>
        </div>
        <SidebarMenuButton
          className="agency-nav-button"
          isActive={view === 'settings'}
          onClick={() => navigate('settings')}
        >
          <Settings />
          Ajans Ayarları
          <span
            className={'connection-dot ' + (configured ? 'online' : '')}
            aria-label={configured ? 'Bağlantı hazır' : 'Kurulum bekliyor'}
          />
        </SidebarMenuButton>
        <div className="owner">
          <span>B</span>
          <div>
            <strong>Buse</strong>
            <small>Kurucu & Yaratıcı Yönetmen</small>
          </div>
          <Heart size={16} aria-hidden="true" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
function AgentCard({
  agent,
  index,
  selected,
  toggle,
}: {
  agent: Agent;
  index: number;
  selected: boolean;
  toggle: () => void;
}) {
  return (
    <article
      className={
        'agent-card tone-' + (index % 6) + (selected ? ' selected' : '')
      }
    >
      <div className="agent-top">
        <span className="agent-avatar" aria-hidden="true">
          {agent.emoji}
        </span>
        <span className="agent-ready">
          {agent.custom ? 'Sana özel' : 'Kütüphanede'}
        </span>
      </div>
      <h3>{agent.title}</h3>
      <p title={agent.description}>{agent.description}</p>
      <div className="agent-bottom">
        <span>{category(agent.division)}</span>
        <button
          className={'agent-add ' + (selected ? 'checked' : '')}
          onClick={toggle}
          aria-label={`${agent.title} ${selected ? 'ekipten çıkar' : 'ekibe ekle'}`}
          aria-pressed={selected}
        >
          {selected ? <Check size={17} /> : <Plus size={18} />}
        </button>
      </div>
    </article>
  );
}
function Markdown({ text }: { text: string }) {
  const blocks = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="markdown">
      {blocks.map((block, i) =>
        block.startsWith('```') ? (
          <pre key={i}>
            <code>
              {block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}
            </code>
          </pre>
        ) : (
          block.split(/\n\n+/).map((paragraph, j) => {
            if (/^#{1,4}\s/.test(paragraph))
              return (
                <h3 key={`${i}-${j}`}>
                  {paragraph.replace(/^#{1,4}\s/, '').replace(/\*\*/g, '')}
                </h3>
              );
            return (
              <p key={`${i}-${j}`}>
                {paragraph
                  .split(/(\*\*[^*]+\*\*)/)
                  .map((part, k) =>
                    part.startsWith('**') ? (
                      <strong key={k}>{part.slice(2, -2)}</strong>
                    ) : (
                      part
                    ),
                  )}
              </p>
            );
          })
        ),
      )}
    </div>
  );
}
export default function Page() {
  const [view, setView] = useState<View>('home');
  const [data, setData] = useState<Snapshot>({
    agents: catalog,
    projects: [],
    configured: false,
    model: 'gpt-4.1-mini',
  });
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [brief, setBrief] = useState(''),
    [title, setTitle] = useState(''),
    [selected, setSelected] = useState<string[]>([
      'agents-orchestrator',
      'product-manager',
      'design-ui-designer',
    ]);
  const [projectDialog, setProjectDialog] = useState(false),
    [agentDialog, setAgentDialog] = useState(false),
    [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(''),
    [division, setDivision] = useState('all'),
    [limit, setLimit] = useState(24),
    [pickSearch, setPickSearch] = useState('');
  const [current, setCurrent] = useState<Project | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [roomLoading, setRoomLoading] = useState(false);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const runRef = useRef<string | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  async function refresh() {
    try {
      setData(await api<Snapshot>());
      setError('');
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setLimit(24);
  }, [search, division]);
  function go(next: View) {
    setView(next);
    setError('');
    setTimeout(() => headingRef.current?.focus(), 0);
  }
  function updateProject(project: Project) {
    setCurrent((p) => (p?.id === project.id ? project : p));
    setData((d) => ({
      ...d,
      projects: [
        project,
        ...d.projects.filter((p) => p.id !== project.id),
      ].sort((a, b) => b.createdAt - a.createdAt),
    }));
  }
  useEffect(() => {
    runRef.current = activeRun;
    if (!activeRun) return;
    let disposed = false;
    async function run() {
      try {
        while (!disposed && runRef.current === activeRun) {
          const response = await api<{ project: Project; busy: boolean }>({
            action: 'step',
            id: activeRun,
          });
          if (disposed) return;
          updateProject(response.project);
          const detail = await api<{ project: Project; messages: Message[] }>(
            undefined,
            '?project=' + encodeURIComponent(activeRun!),
          );
          if (disposed) return;
          setMessages((m) =>
            currentIdRef.current === activeRun ? detail.messages : m,
          );
          if (
            ['completed', 'paused', 'error'].includes(response.project.status)
          ) {
            setActiveRun(null);
            if (response.project.status === 'completed')
              setNotice('Ekibinin ortak sunumu hazır!');
            return;
          }
          if (response.busy)
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (e) {
        if (!disposed) {
          setError((e as Error).message);
          setActiveRun(null);
        }
      }
    }
    void run();
    return () => {
      disposed = true;
      runRef.current = null;
    };
  }, [activeRun]);
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 6
          ? [...s, id]
          : s,
    );
    if (!selected.includes(id) && selected.length >= 6)
      setNotice('Bir projede en fazla 6 personel çalışabilir.');
  }
  async function openProject(project: Project) {
    currentIdRef.current = project.id;
    setCurrent(project);
    setMessages([]);
    setRoomLoading(true);
    go('room');
    try {
      const result = await api<{ project: Project; messages: Message[] }>(
        undefined,
        '?project=' + encodeURIComponent(project.id),
      );
      setCurrent(result.project);
      setMessages(result.messages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRoomLoading(false);
    }
  }
  async function createProject(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await api<{ project: Project }>({
        action: 'create-project',
        title,
        brief,
        agentIds: selected,
      });
      setProjectDialog(false);
      currentIdRef.current = result.project.id;
      updateProject(result.project);
      setCurrent(result.project);
      setMessages([]);
      setView('room');
      setBrief('');
      setTitle('');
      if (data.configured && !activeRun) setActiveRun(result.project.id);
      else if (activeRun)
        setNotice(
          'Projen kaydedildi. Çalışan ekibin tamamlanınca bu projeyi başlatabilirsin.',
        );
      else
        setNotice(
          'Projen kaydedildi. Yapay zekâ bağlantısı kurulunca başlatabilirsin.',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function control(action: 'pause' | 'resume') {
    if (!current) return;
    setSaving(true);
    try {
      const result = await api<{ project: Project }>({
        action,
        id: current.id,
      });
      updateProject(result.project);
      if (action === 'resume') setActiveRun(current.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function addAgent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const result = await api<{ agent: Agent }>({
        action: 'add-agent',
        name: form.get('name'),
        description: form.get('description'),
        prompt: form.get('prompt'),
      });
      setData((d) => ({ ...d, agents: [result.agent, ...d.agents] }));
      setAgentDialog(false);
      setNotice(`${result.agent.title} ajansına katıldı.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function download() {
    if (!current) return;
    const text = `# ${current.title}\n\nBuse’nin Ajansı\n\n${current.output}`;
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download =
      current.title.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ -]/g, '').slice(0, 70) +
      '.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = data.agents.filter(
    (a) =>
      (division === 'all' || a.division === division) &&
      `${a.title} ${a.name} ${a.description} ${category(a.division)}`
        .toLocaleLowerCase('tr')
        .includes(search.toLocaleLowerCase('tr')),
  );
  const picked = data.agents.filter((a) => selected.includes(a.id));
  const displayName =
    view === 'room'
      ? 'Çalışma Odası'
      : view === 'settings'
        ? 'Ajans Ayarları'
        : nav.find((n) => n.id === view)?.label || 'Ajansım';
  const newProject = () => {
    setError('');
    setProjectDialog(true);
  };
  return (
    <SidebarProvider style={{ '--sidebar-width': '245px' } as CSSProperties}>
      <Navigation view={view} go={go} configured={data.configured} />
      <main className="main">
        <header className="topbar">
          <div>
            <SidebarTrigger aria-label="Menüyü aç veya kapat" />
            <span>
              Ajansım <span className="slash">/</span>{' '}
              {view === 'home' ? 'Genel bakış' : displayName}
            </span>
          </div>
          <span className="personal-pill">
            <span />
            Sana özel çalışma alanı
          </span>
        </header>
        <div className="page-content">
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                onClick={() => {
                  setError('');
                  void refresh();
                }}
                aria-label="Yeniden dene"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {view === 'home' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FİKİRLERİNİN YENİ EVİ</div>
                  <h1 ref={headingRef} tabIndex={-1}>
                    Hoş geldin, Buse{' '}
                    <span className="heading-star" aria-hidden="true">
                      ✳
                    </span>
                  </h1>
                  <p>Sen hayal et. Ekibin birlikte şekillendirsin.</p>
                </div>
                <button className="button primary" onClick={newProject}>
                  <Plus size={18} />
                  Yeni proje
                </button>
              </div>
              <div className="dashboard-grid">
                <section className="brief-card">
                  <div className="card-eyebrow">
                    <span className="tiny-icon">
                      <Sparkles size={18} />
                    </span>
                    YARATICI MASAN
                  </div>
                  <h2>
                    <label htmlFor="brief">Bugün ne üretelim?</label>
                  </h2>
                  <p>
                    Bir fikir, bir hedef ya da aklındaki o proje…
                    <br />
                    Ekibine anlat, ilk adımı birlikte atalım.
                  </p>
                  <textarea
                    id="brief"
                    value={brief}
                    maxLength={8000}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Örneğin: Yeni kahve markam için isim, görsel kimlik ve bir lansman planı hazırlayalım."
                  />
                  <div className="brief-bottom">
                    <span>
                      <Users size={15} />
                      {selected.length} personel ekibine seçili
                    </span>
                    <button className="button primary" onClick={newProject}>
                      Ekibimi oluştur
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </section>
                <section className="guide-card">
                  <span className="eyebrow">
                    SENİN AJANSIN. SENİN KURALLARIN.
                  </span>
                  <h2>
                    Bir fikirden
                    <br />
                    <em>birlikte daha fazlasına.</em>
                  </h2>
                  <ol>
                    {[
                      'Fikrini anlat',
                      'Hayalindeki ekibi seç',
                      'Fikir alışverişini izle',
                      'Projenin sunumunu al',
                    ].map((s, i) => (
                      <li key={s}>
                        <span>0{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <button className="text-button" onClick={() => go('guide')}>
                    Nasıl kullanılır?
                    <ArrowUpRight size={18} />
                  </button>
                  <span className="guide-star" aria-hidden="true">
                    ✳
                  </span>
                </section>
              </div>
              <div className="stats">
                <div>
                  <span className="stat-icon">
                    <Users />
                  </span>
                  <div>
                    <strong>{data.agents.length}</strong>
                    <span>Yapay zekâ personeli</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon amber">
                    <Sparkles />
                  </span>
                  <div>
                    <strong>18</strong>
                    <span>Uzmanlık alanı</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon green">
                    <FolderOpen />
                  </span>
                  <div>
                    <strong>
                      {loaded
                        ? data.projects.filter((p) => p.status === 'completed')
                            .length
                        : '—'}
                    </strong>
                    <span>Birlikte hazırlanan proje</span>
                  </div>
                </div>
              </div>
              <section>
                <div className="section-heading">
                  <div>
                    <h2>Ekibinle tanış</h2>
                    <p>
                      Her biri başka bir konuda iyi. Birlikte daha da iyiler.
                    </p>
                  </div>
                  <button className="text-button" onClick={() => go('agents')}>
                    Tüm personeller
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="agent-grid">
                  {data.agents.slice(0, 6).map((a, i) => (
                    <AgentCard
                      key={a.id}
                      agent={a}
                      index={i}
                      selected={selected.includes(a.id)}
                      toggle={() => toggle(a.id)}
                    />
                  ))}
                </div>
              </section>
              {data.projects.length > 0 && (
                <section className="recent-projects">
                  <div className="section-heading">
                    <h2>Son projelerin</h2>
                    <button
                      className="text-button"
                      onClick={() => go('projects')}
                    >
                      Tüm projeler
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {data.projects.slice(0, 3).map((p) => (
                    <button
                      className="project-row"
                      key={p.id}
                      onClick={() => void openProject(p)}
                    >
                      <span className="project-icon">
                        <FolderOpen />
                      </span>
                      <span>
                        <strong>{p.title}</strong>
                        <small>
                          {p.team.length} personel ·{' '}
                          {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                        </small>
                      </span>
                      <span className={'status ' + p.status}>
                        {statusLabels[p.status]}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
          {view === 'agents' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">HAYALİNDEKİ EKİBİ KUR</span>
                  <h1 ref={headingRef} tabIndex={-1}>
                    Yapay Zekâ Personelleri
                  </h1>
                  <p>
                    {data.agents.length} uzman arasından seç veya kendi
                    personelini ekle.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setError('');
                    setAgentDialog(true);
                  }}
                >
                  <Plus size={18} />
                  Personel ekle
                </button>
              </div>
              <div className="filter-bar">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Personel ara"
                    placeholder="İsim, uzmanlık veya yetenek ara…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={division}
                  onValueChange={(v) => setDivision(v || 'all')}
                >
                  <SelectTrigger
                    className="category-select"
                    aria-label="Uzmanlık alanı"
                  >
                    <SelectValue>
                      {division === 'all'
                        ? 'Tüm uzmanlıklar'
                        : category(division)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm uzmanlıklar</SelectItem>
                    <SelectItem value="custom">Kendi Personelim</SelectItem>
                    {Object.entries(divisions).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="selection-bar">
                <span>
                  <Users size={17} />
                  {selected.length} / 6 personel seçildi
                </span>
                <button className="text-button" onClick={newProject}>
                  Bu ekiple proje oluştur
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="agent-grid">
                {filtered.slice(0, limit).map((a, i) => (
                  <AgentCard
                    key={a.id}
                    agent={a}
                    index={i}
                    selected={selected.includes(a.id)}
                    toggle={() => toggle(a.id)}
                  />
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <Search />
                  <h2>Bu aramada personel bulunamadı</h2>
                  <p>Farklı bir kelime dene veya kendi personelini ekle.</p>
                </div>
              )}
              {filtered.length > limit && (
                <button
                  className="button secondary load-more"
                  onClick={() => setLimit((n) => n + 24)}
                >
                  Daha fazla göster ({filtered.length - limit})
                </button>
              )}
            </>
          )}
          {view === 'projects' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">FİKİRDEN SUNUMA</span>
                  <h1 ref={headingRef} tabIndex={-1}>
                    Projelerim
                  </h1>
                  <p>
                    Ekibinin çalışmaları, tartışmaları ve ortak sunumları
                    burada.
                  </p>
                </div>
                <button className="button primary" onClick={newProject}>
                  <Plus size={18} />
                  Yeni proje
                </button>
              </div>
              {!loaded ? (
                <div className="empty-state">
                  <LoaderCircle className="spin" />
                  <p>Projelerin yükleniyor…</p>
                  <button
                    className="text-button"
                    onClick={() => void refresh()}
                  >
                    Yeniden dene
                  </button>
                </div>
              ) : !data.projects.length ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <FolderOpen />
                  </span>
                  <h2>İlk güzel fikir senden.</h2>
                  <p>
                    Ekibini seç, projenin kısa açıklamasını yaz.
                    <br />
                    Ajansının ilk çalışmasını birlikte başlatalım.
                  </p>
                  <button className="button primary" onClick={newProject}>
                    <Plus size={17} />
                    İlk projemi oluştur
                  </button>
                </div>
              ) : (
                <div className="project-list">
                  {data.projects.map((p) => (
                    <button
                      className="project-row"
                      key={p.id}
                      onClick={() => void openProject(p)}
                    >
                      <span className="project-icon">
                        <FolderOpen />
                      </span>
                      <span>
                        <strong>{p.title}</strong>
                        <small>
                          {p.team.length} personel ·{' '}
                          {new Date(p.createdAt).toLocaleDateString('tr-TR')} ·{' '}
                          {p.cursor}/{p.total} adım
                        </small>
                      </span>
                      <span className={'status ' + p.status}>
                        {statusLabels[p.status]}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {view === 'guide' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">BİRLİKTE ÜRETMEK ÇOK KOLAY</span>
                  <h1 ref={headingRef} tabIndex={-1}>
                    Nasıl kullanılır?
                  </h1>
                  <p>Sen yaratıcı yönetmensin. Ekibine yön vermen yeterli.</p>
                </div>
              </div>
              <div className="guide-steps">
                {[
                  {
                    icon: Lightbulb,
                    title: 'Fikrini anlat',
                    text: 'Ne hazırlamak istiyorsun? Hedefini, kimin için olduğunu, istediğin çıktıyı ve varsa sınırlarını yaz.',
                  },
                  {
                    icon: Users,
                    title: 'Ekibini seç',
                    text: '2–6 personeli projene ekle. Farklı uzmanlıkları bir araya getir; koordinatörün ortak sonucu toparlasın.',
                  },
                  {
                    icon: MessageSquare,
                    title: 'Birlikte düşünmelerini izle',
                    text: 'Her personel önce kendi önerisini hazırlar. Sonra ekip arkadaşlarının önerilerini inceler, itiraz eder ve geliştirir.',
                  },
                  {
                    icon: Presentation,
                    title: 'Ortak sunumunu al',
                    text: 'Tüm katkılar bir proje önerisinde birleşir. Kararları, görevleri, uygulama planını ve açık noktaları oku; sunumu indir.',
                  },
                ].map(({ icon: Icon, title, text }, i) => (
                  <article key={title}>
                    <div>
                      <span>0{i + 1}</span>
                      <Icon />
                    </div>
                    <h2>{title}</h2>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
              <div className="example-brief">
                <span className="eyebrow">İYİ BİR BAŞLANGIÇ ÖRNEĞİ</span>
                <blockquote>
                  “Kadın girişimcilere hitap eden bir kahve markası kuruyorum.
                  Samimi ve enerjik bir isim, görsel kimlik önerisi ve ilk 7
                  günlük Instagram içerik planı hazırlayın. Küçük bir bütçeyle
                  uygulanabilsin.”
                </blockquote>
                <button
                  className="text-button"
                  onClick={() => {
                    setBrief(
                      'Kadın girişimcilere hitap eden bir kahve markası kuruyorum. Samimi ve enerjik bir isim, görsel kimlik önerisi ve ilk 7 günlük Instagram içerik planı hazırlayın. Küçük bir bütçeyle uygulanabilsin.',
                    );
                    setTitle('Yeni kahve markam');
                    newProject();
                  }}
                >
                  Bu örnekle dene
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="faq">
                {[
                  [
                    'Kendi personelimi ekleyebilir miyim?',
                    'Evet. Yapay Zekâ Personelleri bölümündeki Personel ekle düğmesini kullan. Adını, uzmanlığını ve nasıl çalışmasını istediğini yaz. Personelin kaydedilir ve sonraki projelerinde seçilebilir.',
                  ],
                  [
                    'Sekmeyi kapatırsam ne olur?',
                    'Çalışmanın ilerlemesi için ajans sekmesini açık tut. Tamamlanan adımlar ve projeler kaydedilir. Sekmeyi kapatır veya bağlantını kaybedersen projeni yeniden açıp Devam et düğmesine basabilirsin. Açık bir proje çalışırken ajansın diğer bölümlerini gezebilirsin.',
                  ],
                  [
                    'Gerçek yapay zekâ nasıl etkinleşir?',
                    'Ajans Ayarları bölümünde bağlantı durumunu kontrol et. OpenAI bağlantısı kurulunca seçtiğin uzmanlar gerçek yanıtlar üretir. Bağlantı olmadan personel ekleyebilir ve projelerini kaydedebilirsin.',
                  ],
                  [
                    'Projenin sonunda ne teslim edilir?',
                    'Ekip sana bir proje önerisi, içerik veya teknik taslak ve uygulama planı sunar. Bu sürüm harici uygulamalarda işlem yapmaz, kodu çalıştırmaz veya siteni yayınlamaz. Hazırlanan taslağı inceleyip uygulama adımına sen karar verirsin.',
                  ],
                  [
                    'Kullanım ücretli mi?',
                    'Gerçek personel yanıtları bağlı OpenAI hesabının API kullanımına yansır. Her projede personel başına bir öneri ve bir değerlendirme, ardından bir ortak sunum üretilir. 3 personellik ekip toplam 7 yapay zekâ isteği yapar.',
                  ],
                ].map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </>
          )}
          {view === 'settings' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">HER ŞEY SENİN AJANSINA GÖRE</span>
                  <h1 ref={headingRef} tabIndex={-1}>
                    Ajans Ayarları
                  </h1>
                  <p>Markan ve ekibinin çalışma bağlantısı.</p>
                </div>
              </div>
              <div className="settings-grid">
                <section className="settings-card">
                  <Brand />
                  <div className="setting-row">
                    <span>Ajans adı</span>
                    <strong>Buse’nin Ajansı</strong>
                  </div>
                  <div className="setting-row">
                    <span>Yaratıcı yönetmen</span>
                    <strong>Buse</strong>
                  </div>
                  <p>
                    Personellerin, projelerin ve ortak sunumların bu çalışma
                    alanında saklanır.
                  </p>
                </section>
                <section className="settings-card">
                  <div className="section-heading">
                    <h2>Yapay zekâ bağlantısı</h2>
                    <span
                      className={
                        'status ' + (data.configured ? 'completed' : 'paused')
                      }
                    >
                      {!loaded
                        ? 'Kontrol ediliyor'
                        : data.configured
                          ? 'Bağlı'
                          : 'Kurulum bekliyor'}
                    </span>
                  </div>
                  <p>
                    {data.configured
                      ? 'Ekibin gerçek yapay zekâ yanıtlarıyla çalışmaya hazır.'
                      : 'Gerçek ekip çalışması için OpenAI bağlantısının kurulması gerekiyor. Bu sırada personellerini ve projelerini hazırlayabilirsin.'}
                  </p>
                  <div className="setting-row">
                    <span>Çalışma modeli</span>
                    <strong>{data.model}</strong>
                  </div>
                  {!data.configured && (
                    <div className="setup-note">
                      <strong>Bağlantıyı nasıl kurarım?</strong>
                      <p>
                        Codex’te OpenAI Developers eklentisini etkinleştir ve
                        “Buse’nin Ajansı’nın yapay zekâ bağlantısını kur” yaz.
                        Anahtarın güvenli sunucu ayarına eklenir.
                      </p>
                      <details>
                        <summary>Teknik kurulum bilgisi</summary>
                        <p>
                          Sunucuya OPENAI_API_KEY gizli değişkenini ekle.
                          OPENAI_MODEL isteğe bağlıdır. Anahtarı GitHub’a veya
                          tarayıcı koduna koyma. Kendi sunucunda barındıracaksan
                          bu kişisel panelin tüm yollarını kimlik doğrulamasıyla
                          koru.
                        </p>
                      </details>
                    </div>
                  )}
                  <button
                    className="button secondary"
                    onClick={() => void refresh()}
                  >
                    <RefreshCw size={16} />
                    Bağlantıyı kontrol et
                  </button>
                </section>
              </div>
            </>
          )}
          {view === 'room' && current && (
            <>
              <button
                className="text-button back-button"
                onClick={() => go('projects')}
              >
                <ArrowLeft size={16} />
                Projelerime dön
              </button>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">EKİBİN AYNI MASADA</span>
                  <h1 ref={headingRef} tabIndex={-1}>
                    {current.title}
                  </h1>
                  <p>
                    {current.team.length} personel ·{' '}
                    <span className={'inline-status ' + current.status}>
                      {statusLabels[current.status]}
                    </span>
                  </p>
                </div>
                <div className="room-actions">
                  {current.status === 'completed' ? (
                    <button className="button primary" onClick={download}>
                      <Download size={17} />
                      Sunumu indir
                    </button>
                  ) : activeRun === current.id ? (
                    <button
                      className="button secondary"
                      disabled={saving || current.status === 'paused'}
                      onClick={() => void control('pause')}
                    >
                      <Pause size={17} />
                      {current.status === 'paused'
                        ? 'Adım bitince duracak'
                        : 'Duraklat'}
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      disabled={!data.configured || saving || !!activeRun}
                      onClick={() => void control('resume')}
                    >
                      <Play size={17} />
                      {current.cursor ? 'Devam et' : 'Ekibi başlat'}
                    </button>
                  )}
                </div>
              </div>
              {!data.configured && (
                <div className="setup-banner">
                  <Sparkles size={18} />
                  <span>
                    Projen kaydedildi. Ekibin çalışması için yapay zekâ
                    bağlantısını tamamla.
                  </span>
                  <button
                    className="text-button"
                    onClick={() => go('settings')}
                  >
                    Bağlantı ayarları
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <div className="room-grid">
                <div className="discussion">
                  <div className="discussion-header">
                    <div>
                      <MessageSquare size={19} />
                      <h2>Ekip masası</h2>
                    </div>
                    <span>
                      {current.cursor} / {current.total} adım
                    </span>
                  </div>
                  <Progress
                    value={Math.round((current.cursor / current.total) * 100)}
                    aria-label="Proje ilerlemesi"
                  />
                  {current.error && (
                    <div className="error-banner" role="alert">
                      <AlertCircle size={18} />
                      <span>{current.error}</span>
                    </div>
                  )}
                  {roomLoading ? (
                    <div className="empty-state">
                      <LoaderCircle className="spin" />
                      <p>Ekip masası yükleniyor…</p>
                    </div>
                  ) : !messages.length ? (
                    <div className="empty-state compact">
                      <span className="empty-icon">
                        <MessageSquare />
                      </span>
                      <h2>Ekibin ilk fikri burada başlayacak.</h2>
                      <p>
                        Personeller sırasıyla önerilerini sunacak,
                        <br />
                        ardından birbirlerinin fikirlerini geliştirecek.
                      </p>
                    </div>
                  ) : (
                    messages
                      .filter((m) => m.phase !== 'presentation')
                      .map((m) => (
                        <article className="message-card" key={m.id}>
                          <div className="message-meta">
                            <span className="small-avatar" aria-hidden="true">
                              {current.team.find((a) => a.id === m.agentId)
                                ?.emoji || '✦'}
                            </span>
                            <div>
                              <strong>{m.agentName}</strong>
                              <small>{phaseLabels[m.phase]}</small>
                            </div>
                            <span>{String(m.step + 1).padStart(2, '0')}</span>
                          </div>
                          <Markdown text={m.body} />
                        </article>
                      ))
                  )}
                  {activeRun === current.id && (
                    <div className="working" role="status">
                      <LoaderCircle className="spin" size={18} />
                      {current.cursor < current.team.length
                        ? `${current.team[current.cursor]?.title || 'Ekibin'} önerisini hazırlıyor…`
                        : current.cursor < current.team.length * 2
                          ? 'Ekip fikirleri değerlendiriyor…'
                          : 'Ortak sunum hazırlanıyor…'}
                    </div>
                  )}
                  {current.output && (
                    <section className="presentation-card">
                      <div className="card-eyebrow">
                        <Presentation size={20} />
                        BUSE’YE ÖZEL ORTAK SUNUM
                      </div>
                      <Markdown text={current.output} />
                      <button className="button primary" onClick={download}>
                        <Download size={17} />
                        Sunumu indir
                      </button>
                    </section>
                  )}
                </div>
                <aside className="room-aside">
                  <section>
                    <span className="eyebrow">PROJE ÖZETİN</span>
                    <p>{current.brief}</p>
                  </section>
                  <section>
                    <span className="eyebrow">BU PROJENİN EKİBİ</span>
                    {current.team.map((a) => (
                      <div className="team-member" key={a.id}>
                        <span className="small-avatar" aria-hidden="true">
                          {a.emoji}
                        </span>
                        <div>
                          <strong>{a.title}</strong>
                          <small>{category(a.division)}</small>
                        </div>
                      </div>
                    ))}
                  </section>
                  <section className="room-note">
                    <BookOpen size={19} />
                    <p>
                      Çalışma sırasında sekmeyi açık tut. Tamamlanan adımlar
                      kaydedilir; daha sonra kaldığın yerden devam edebilirsin.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              Buse’nin Ajansı <span aria-hidden="true">✦</span> Fikirlerine iyi
              gelen ekip.
            </span>
            <button onClick={() => go('guide')}>
              Nasıl kullanılır?
              <ArrowUpRight size={14} />
            </button>
          </footer>
        </div>
      </main>
      <Dialog
        open={projectDialog}
        onOpenChange={(open) => {
          if (!saving) setProjectDialog(open);
        }}
      >
        <DialogContent className="agency-dialog project-dialog">
          <DialogHeader>
            <DialogTitle>Yeni bir fikir, yeni bir proje.</DialogTitle>
            <DialogDescription>
              Ne istediğini anlat; birlikte çalışacak 2–6 personeli seç.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createProject}>
            <label htmlFor="project-title">Proje adı</label>
            <input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örneğin: Yeni kahve markam"
              minLength={2}
              maxLength={100}
              required
            />
            <label htmlFor="project-brief">Ekibin ne hazırlasın?</label>
            <textarea
              id="project-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Hedefini, hedef kitleni ve beklediğin çıktıyı anlat…"
              minLength={20}
              maxLength={8000}
              required
            />
            <div className="picker-heading">
              <label htmlFor="picker-search">Proje ekibi</label>
              <span>{selected.length}/6 seçildi</span>
            </div>
            <div className="picked-agents">
              {picked.map((a) => (
                <button type="button" key={a.id} onClick={() => toggle(a.id)}>
                  {a.emoji} {a.title}
                  <X size={13} />
                  <span className="sr-only">ekipten çıkar</span>
                </button>
              ))}
            </div>
            <input
              id="picker-search"
              placeholder="273+ personel içinde ara…"
              value={pickSearch}
              onChange={(e) => setPickSearch(e.target.value)}
            />
            <div className="agent-picker">
              {data.agents
                .filter((a) =>
                  `${a.title} ${a.name} ${category(a.division)}`
                    .toLocaleLowerCase('tr')
                    .includes(pickSearch.toLocaleLowerCase('tr')),
                )
                .slice(0, pickSearch ? 60 : 12)
                .map((a) => (
                  <label className="picker-row" key={a.id}>
                    <Checkbox
                      checked={selected.includes(a.id)}
                      disabled={
                        !selected.includes(a.id) && selected.length >= 6
                      }
                      onCheckedChange={() => toggle(a.id)}
                    />
                    <span className="small-avatar" aria-hidden="true">
                      {a.emoji}
                    </span>
                    <span>
                      <strong>{a.title}</strong>
                      <small>{category(a.division)}</small>
                    </span>
                  </label>
                ))}
            </div>
            <p className="form-hint">
              {selected.length * 2 + 1} yapay zekâ adımı: öneriler,
              değerlendirmeler ve ortak sunum.{' '}
              {data.configured
                ? 'Kullanım bağlı API hesabına yansır.'
                : 'Bağlantı kurulana kadar projen kaydedilir.'}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setProjectDialog(false)}
                disabled={saving}
              >
                Vazgeç
              </button>
              <button
                className="button primary"
                disabled={saving || selected.length < 2 || !loaded}
              >
                {saving ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}{' '}
                {data.configured && !activeRun
                  ? 'Kaydet ve başlat'
                  : 'Projeyi kaydet'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={agentDialog}
        onOpenChange={(open) => {
          if (!saving) setAgentDialog(open);
        }}
      >
        <DialogContent className="agency-dialog">
          <DialogHeader>
            <DialogTitle>Ajansına yeni bir yetenek kat.</DialogTitle>
            <DialogDescription>
              Personelinin uzmanlığını ve nasıl çalışacağını sen belirle.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addAgent}>
            <label htmlFor="agent-name">Personel adı</label>
            <input
              id="agent-name"
              name="name"
              placeholder="Örneğin: Lara, Marka Stratejisti"
              minLength={2}
              maxLength={60}
              required
            />
            <label htmlFor="agent-description">Uzmanlık alanı</label>
            <input
              id="agent-description"
              name="description"
              placeholder="Küçük markalar için yaratıcı konumlandırma"
              minLength={5}
              maxLength={250}
              required
            />
            <label htmlFor="agent-prompt">Görev tanımı ve çalışma tarzı</label>
            <textarea
              id="agent-prompt"
              name="prompt"
              placeholder="Hangi konuda uzmansın? Neye dikkat etmelisin? Ekip arkadaşlarının fikirlerini nasıl değerlendirmelisin?"
              minLength={20}
              maxLength={12000}
              required
            />
            <p className="form-hint">
              Kişisel bilgi veya şifre ekleme. Bu tanım, projeye katıldığında
              yapay zekâya iletilir.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setAgentDialog(false)}
                disabled={saving}
              >
                Vazgeç
              </button>
              <button className="button primary" disabled={saving || !loaded}>
                {saving ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                Personeli ekle
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
