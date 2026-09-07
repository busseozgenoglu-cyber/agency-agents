import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import catalog from '@/data/catalog.json';
import prompts from '@/data/prompts.json';
import type { Agent } from '@/lib/types';
import {
  AppError,
  publicProject,
  textField,
  getProject,
  getMessages,
  advanceProject,
  parseResponse,
  type ProjectRow,
} from '@/lib/workflow';
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
async function agents(): Promise<Agent[]> {
  const rows = await getDb()
    .prepare('SELECT data FROM agents ORDER BY created_at DESC')
    .all<{ data: string }>();
  return [...rows.results.map((r) => JSON.parse(r.data) as Agent), ...catalog];
}
async function generate(
  instructions: string,
  context: string,
  attempt: string,
) {
  if (!env.OPENAI_API_KEY)
    throw new AppError(
      'Yapay zekâ bağlantısı henüz kurulmadı. Ajans Ayarları bölümünden kurulum adımlarına bakın.',
      503,
    );
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Client-Request-Id': attempt,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions,
        input: [
          { role: 'user', content: [{ type: 'input_text', text: context }] },
        ],
        store: false,
        max_output_tokens: 5000,
      }),
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    throw new AppError(
      'Bağlantı zaman aşımına uğradı. Sonuç kaydedilmemiş olabilir; tekrar denemek yeni bir API kullanımı oluşturabilir.',
      504,
    );
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new AppError(
        'Yapay zekâ anahtarı veya erişim izni geçersiz. Bağlantı ayarlarını kontrol edin.',
        503,
      );
    if (response.status === 429)
      throw new AppError(
        'Yapay zekâ kullanım limiti veya bakiye sınırına ulaşıldı. Hesabınızı kontrol edip daha sonra devam edin.',
        429,
      );
    throw new AppError(
      'Yapay zekâ hizmeti bu adımı tamamlayamadı. Model ayarını kontrol edip yeniden deneyin.',
      502,
    );
  }
  return parseResponse(await response.json());
}
function handleError(e: unknown) {
  return json(
    {
      error:
        e instanceof AppError
          ? e.message
          : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    },
    e instanceof AppError ? e.status : 500,
  );
}
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('project');
    if (id) {
      const row = await getProject(getDb(), id);
      return json({
        project: publicProject(row),
        messages: await getMessages(getDb(), id),
      });
    }
    const [all, rows] = await Promise.all([
      agents(),
      getDb()
        .prepare('SELECT * FROM projects ORDER BY created_at DESC')
        .all<ProjectRow>(),
    ]);
    return json({
      agents: all.map(({ prompt, ...a }) => a),
      projects: rows.results.map(publicProject),
      configured: !!env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
    });
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      throw new AppError('Bu isteğe izin verilmiyor.', 403);
    if (!request.headers.get('content-type')?.includes('application/json'))
      throw new AppError('Geçersiz istek.', 415);
    if (Number(request.headers.get('content-length') || 0) > 40000)
      throw new AppError('İstek çok büyük.', 413);
    const raw = await request.text();
    if (raw.length > 40000) throw new AppError('İstek çok büyük.', 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError('Geçersiz istek.');
    }
    if (!body || typeof body !== 'object')
      throw new AppError('Geçersiz istek.');
    const db = getDb();
    if (body.action === 'add-agent') {
      const agent: Agent = {
        id: crypto.randomUUID(),
        name: textField(body.name, 'Personel adı', 2, 60),
        title: textField(body.name, 'Personel adı', 2, 60),
        description: textField(body.description, 'Uzmanlık', 5, 250),
        prompt: textField(body.prompt, 'Görev tanımı', 20, 12000),
        division: 'custom',
        emoji: '✦',
        color: '#b53561',
        custom: true,
      };
      await db
        .prepare('INSERT INTO agents (id,data,created_at) VALUES (?,?,?)')
        .bind(agent.id, JSON.stringify(agent), Date.now())
        .run();
      return json({ agent: { ...agent, prompt: undefined } }, 201);
    }
    if (body.action === 'create-project') {
      const title = textField(body.title, 'Proje adı', 2, 100),
        brief = textField(body.brief, 'Proje açıklaması', 20, 8000);
      if (
        !Array.isArray(body.agentIds) ||
        body.agentIds.length < 2 ||
        body.agentIds.length > 6 ||
        new Set(body.agentIds).size !== body.agentIds.length
      )
        throw new AppError('Ekibiniz için 2–6 farklı personel seçin.');
      const all = await agents();
      const team = body.agentIds.map((id) => {
        const a = all.find((a) => a.id === id);
        if (!a) throw new AppError('Seçilen personel bulunamadı.');
        return {
          ...a,
          prompt: a.prompt || (prompts as Record<string, string>)[a.id],
        };
      });
      const id = crypto.randomUUID(),
        now = Date.now();
      await db
        .prepare(
          'INSERT INTO projects (id,title,brief,team,total,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          title,
          brief,
          JSON.stringify(team),
          team.length * 2 + 1,
          now,
          now,
        )
        .run();
      return json({ project: publicProject(await getProject(db, id)) }, 201);
    }
    const id = textField(body.id, 'Proje', 1, 80);
    await getProject(db, id);
    if (body.action === 'step') {
      if (!env.OPENAI_API_KEY)
        throw new AppError(
          'Yapay zekâ bağlantısı henüz kurulmadı. Projen kaydedildi; bağlantı kurulunca başlatabilirsin.',
          503,
        );
      return json(await advanceProject(db, id, generate));
    }
    if (body.action === 'pause') {
      await db
        .prepare(
          "UPDATE projects SET status='paused', updated_at=? WHERE id=? AND status IN ('queued','running','error')",
        )
        .bind(Date.now(), id)
        .run();
      return json({ project: publicProject(await getProject(db, id)) });
    }
    if (body.action === 'resume') {
      await db
        .prepare(
          "UPDATE projects SET status=CASE WHEN lease_token IS NOT NULL THEN 'running' ELSE 'queued' END, error='', updated_at=? WHERE id=? AND status IN ('paused','error')",
        )
        .bind(Date.now(), id)
        .run();
      return json({ project: publicProject(await getProject(db, id)) });
    }
    throw new AppError('İşlem bulunamadı.', 404);
  } catch (e) {
    return handleError(e);
  }
}
