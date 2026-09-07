import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const divisions = JSON.parse(
  readFileSync(resolve(root, 'divisions.json'), 'utf8'),
).divisions;
const translations = {
  academic: 'Akademi',
  design: 'Tasarım',
  engineering: 'Yazılım ve Mühendislik',
  finance: 'Finans',
  'game-development': 'Oyun Geliştirme',
  gis: 'Harita ve Coğrafi Bilgi',
  healthcare: 'Sağlık',
  marketing: 'Pazarlama',
  'paid-media': 'Dijital Reklam',
  product: 'Ürün Yönetimi',
  'project-management': 'Proje Yönetimi',
  research: 'Araştırma',
  sales: 'Satış',
  security: 'Güvenlik',
  'spatial-computing': 'XR ve Uzamsal Teknolojiler',
  specialized: 'Özel Uzmanlıklar',
  support: 'Destek',
  testing: 'Test ve Kalite',
};
const featured = {
  'agents-orchestrator': [
    'Ajans Koordinatörü',
    'Ekibin fikirlerini bir araya getirir, ortak proje sunumunu hazırlar.',
  ],
  'product-manager': [
    'Proje Stratejisti',
    'Fikrinizi net hedeflere ve uygulanabilir bir yol haritasına dönüştürür.',
  ],
  'design-ui-designer': [
    'Görsel Tasarımcı',
    'Markanıza uygun, estetik ve kullanımı kolay arayüzler tasarlar.',
  ],
  'marketing-content-creator': [
    'İçerik Uzmanı',
    'Markanızın sesini bulur; yaratıcı metin ve içerik fikirleri üretir.',
  ],
  'engineering-frontend-developer': [
    'Yazılım Geliştirici',
    'Web arayüzünüz için teknik çözümler ve uygulama planları hazırlar.',
  ],
  'testing-reality-checker': [
    'Kalite Denetçisi',
    'Fikirlerdeki eksikleri bulur, varsayımları sorgular ve kaliteyi değerlendirir.',
  ],
};
const agents = [];
function scan(dir, division) {
  for (const file of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = resolve(dir, file.name);
    if (file.isDirectory()) scan(path, division);
    else if (file.name.endsWith('.md')) {
      const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
      const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) throw new Error(`Missing frontmatter: ${path}`);
      const meta = yaml.load(match[1]);
      const id = basename(file.name, '.md');
      if (!meta.name || !meta.description || agents.some((a) => a.id === id))
        throw new Error(`Invalid agent: ${id}`);
      agents.push({
        id,
        name: meta.name,
        title: featured[id]?.[0] || meta.name,
        description: featured[id]?.[1] || meta.description,
        division,
        emoji: meta.emoji || '✦',
        color: divisions[division].color,
        prompt: match[2].trim(),
        source: `${division}/${path.slice(resolve(root, division).length + 1)}`,
      });
    }
  }
}
for (const division of Object.keys(divisions).sort())
  scan(resolve(root, division), division);
agents.sort((a, b) => {
  const order = Object.keys(featured);
  return (
    (order.includes(a.id) ? order.indexOf(a.id) : 100) -
      (order.includes(b.id) ? order.indexOf(b.id) : 100) ||
    a.title.localeCompare(b.title)
  );
});
mkdirSync(resolve(root, 'panel/data'), { recursive: true });
writeFileSync(
  resolve(root, 'panel/data/catalog.json'),
  JSON.stringify(
    agents.map(({ prompt, ...a }) => a),
    null,
    2,
  ) + '\n',
);
writeFileSync(
  resolve(root, 'panel/data/prompts.json'),
  JSON.stringify(Object.fromEntries(agents.map((a) => [a.id, a.prompt]))) +
    '\n',
);
writeFileSync(
  resolve(root, 'panel/data/divisions.json'),
  JSON.stringify(translations, null, 2) + '\n',
);
console.log(
  `Exported ${agents.length} agents across ${Object.keys(divisions).length} divisions.`,
);
