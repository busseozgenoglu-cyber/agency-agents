import { env } from 'cloudflare:workers';
export function getDb(): D1Database {
  if (!env.DB)
    throw new Error(
      'Proje kaydı şu anda kullanılamıyor. Lütfen tekrar deneyin.',
    );
  return env.DB;
}
