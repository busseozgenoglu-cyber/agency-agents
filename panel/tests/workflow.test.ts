import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  advanceProject,
  getProject,
  getMessages,
  parseResponse,
  textField,
  chooseStage,
  publicProject,
} from '../lib/workflow.ts';
import type { Agent } from '../lib/types.ts';

function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new URL('../drizzle/0000_slippery_catseye.sql', import.meta.url),
      'utf8',
    ),
  );
  class Statement {
    sql: string;
    values: unknown[] = [];
    constructor(sql: string) {
      this.sql = sql;
    }
    bind(...values: unknown[]) {
      this.values = values;
      return this;
    }
    async first() {
      return sqlite.prepare(this.sql).get(...(this.values as never[])) || null;
    }
    async all() {
      return {
        results: sqlite.prepare(this.sql).all(...(this.values as never[])),
      };
    }
    async run() {
      const result = sqlite.prepare(this.sql).run(...(this.values as never[]));
      return { meta: { changes: Number(result.changes) } };
    }
  }
  const adapter = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  const db = adapter as unknown as D1Database;
  const team: Agent[] = [
    {
      id: 'design',
      name: 'Designer',
      title: 'Tasarımcı',
      description: 'Tasarım',
      division: 'design',
      emoji: '✦',
      color: '#000',
      prompt: 'Design role private body',
    },
    {
      id: 'quality',
      name: 'QA',
      title: 'Kalite',
      description: 'Test',
      division: 'testing',
      emoji: '✦',
      color: '#000',
      prompt: 'QA private body',
    },
  ];
  sqlite
    .prepare(
      'INSERT INTO projects (id,title,brief,team,total,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
    )
    .run(
      'test',
      'Kahve markası',
      'Kadın girişimciler için kahve markası ve içerik planı',
      JSON.stringify(team),
      5,
      1,
      1,
    );
  return { sqlite, db, team };
}
function deferred() {
  let resolve!: (s: string) => void;
  const promise = new Promise<string>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function untilClaim(sqlite: DatabaseSync) {
  for (let i = 0; i < 20; i++) {
    if (sqlite.prepare('SELECT lease_token FROM projects').get()?.lease_token)
      return;
    await new Promise((r) => setTimeout(r, 1));
  }
  throw new Error('No claim');
}

test('real workflow feeds all prior proposals into review and synthesis, then survives reload', async () => {
  const { db } = setup();
  const contexts: Record<string, unknown>[] = [];
  for (let i = 0; i < 5; i++)
    await advanceProject(db, 'test', async (_, context) => {
      contexts.push(JSON.parse(context));
      return `output ${i}`;
    });
  const row = await getProject(db, 'test');
  assert.equal(row.status, 'completed');
  assert.equal(row.cursor, 5);
  assert.equal(row.output, 'output 4');
  const messages = await getMessages(db, 'test');
  assert.deepEqual(
    messages.map((m) => m.phase),
    ['proposal', 'proposal', 'review', 'review', 'presentation'],
  );
  assert.equal((contexts[2].discussion as unknown[]).length, 2);
  assert.equal((contexts[4].discussion as unknown[]).length, 4);
  let invoked = false;
  await advanceProject(db, 'test', async () => {
    invoked = true;
    return 'bad';
  });
  assert.equal(invoked, false);
  assert.equal(
    JSON.stringify(publicProject(row)).includes('private body'),
    false,
  );
});
test('concurrent clicks claim one stage only', async () => {
  const { db, sqlite } = setup();
  const deferredResult = deferred();
  let calls = 0;
  const first = advanceProject(db, 'test', async () => {
    calls++;
    return deferredResult.promise;
  });
  await untilClaim(sqlite);
  const second = await advanceProject(db, 'test', async () => {
    calls++;
    return 'duplicate';
  });
  assert.equal(second.busy, true);
  deferredResult.resolve('saved');
  await first;
  assert.equal(calls, 1);
  assert.equal((await getMessages(db, 'test')).length, 1);
});
test('pause retains in-flight result and prevents the next stage', async () => {
  const { db, sqlite } = setup();
  const d = deferred();
  const pending = advanceProject(db, 'test', () => d.promise);
  await untilClaim(sqlite);
  sqlite.prepare("UPDATE projects SET status='paused' WHERE id='test'").run();
  d.resolve('paid result');
  await pending;
  const row = await getProject(db, 'test');
  assert.equal(row.status, 'paused');
  assert.equal(row.cursor, 1);
  assert.equal((await getMessages(db, 'test'))[0].body, 'paid result');
  await advanceProject(db, 'test', async () => {
    throw new Error('must not call');
  });
  assert.equal((await getProject(db, 'test')).cursor, 1);
});
test('rapid pause and resume cannot release the running lease', async () => {
  const { db, sqlite } = setup();
  const d = deferred();
  const pending = advanceProject(db, 'test', () => d.promise);
  await untilClaim(sqlite);
  sqlite.exec(
    "UPDATE projects SET status='paused'; UPDATE projects SET status=CASE WHEN lease_token IS NOT NULL THEN 'running' ELSE 'queued' END",
  );
  const second = await advanceProject(db, 'test', async () => {
    throw new Error('duplicate');
  });
  assert.equal(second.busy, true);
  d.resolve('first result');
  await pending;
  assert.equal((await getMessages(db, 'test'))[0].body, 'first result');
});
test('an expired lease can be reclaimed; old result cannot overwrite new one', async () => {
  const { db, sqlite } = setup();
  const d = deferred();
  const stale = advanceProject(db, 'test', () => d.promise);
  await untilClaim(sqlite);
  sqlite.prepare('UPDATE projects SET lease_until=0').run();
  await advanceProject(db, 'test', async () => 'new winner');
  d.resolve('old loser');
  await stale;
  const messages = await getMessages(db, 'test');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].body, 'new winner');
  assert.equal((await getProject(db, 'test')).cursor, 1);
});
test('provider errors preserve earlier steps and require explicit resume', async () => {
  const { db, sqlite } = setup();
  await advanceProject(db, 'test', async () => 'first');
  await advanceProject(db, 'test', async () => {
    throw new Error('secret-provider-detail');
  });
  let row = await getProject(db, 'test');
  assert.equal(row.status, 'error');
  assert.equal(row.cursor, 1);
  assert.equal(row.error.includes('secret-provider'), false);
  sqlite
    .prepare("UPDATE projects SET status='queued', error='' WHERE id='test'")
    .run();
  await advanceProject(db, 'test', async () => 'second');
  row = await getProject(db, 'test');
  assert.equal(row.cursor, 2);
  assert.equal((await getMessages(db, 'test')).length, 2);
});
test('failed database transaction cannot leave partial stage or advance cursor', async () => {
  const { db, sqlite } = setup();
  sqlite.exec(
    "CREATE TRIGGER fail_output BEFORE UPDATE OF cursor ON projects BEGIN SELECT RAISE(ABORT, 'test'); END;",
  );
  await advanceProject(db, 'test', async () => 'provider result');
  assert.equal((await getProject(db, 'test')).cursor, 0);
  assert.equal((await getMessages(db, 'test')).length, 0);
  assert.equal((await getProject(db, 'test')).status, 'error');
});
test('parser collects message text after reasoning and other output items', () => {
  assert.equal(
    parseResponse({
      status: 'completed',
      output: [
        { type: 'reasoning' },
        { type: 'message', content: [{ type: 'output_text', text: 'one' }] },
        { type: 'message', content: [{ type: 'output_text', text: 'two' }] },
      ],
    }),
    'one\ntwo',
  );
});
test('refusal, empty output and incomplete response never become a finished result', () => {
  for (const data of [
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [] },
    {
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'refusal', text: 'no' }] }],
    },
  ])
    assert.throws(() => parseResponse(data));
});
test('brief validation and stage bounds reject invalid inputs', () => {
  assert.throws(() => textField('  ', 'Brief', 20, 8000));
  assert.throws(() => textField('x'.repeat(8001), 'Brief', 20, 8000));
  const { team } = setup();
  assert.throws(() => chooseStage(5, team));
  assert.equal(chooseStage(4, team).phase, 'presentation');
});
test('catalog has unique ids, nested agents and folded descriptions', () => {
  const agents = JSON.parse(
    readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'),
  );
  assert.ok(agents.length > 0);
  assert.equal(new Set(agents.map((a: Agent) => a.id)).size, agents.length);
  assert.ok(
    agents.some((a: { source: string }) =>
      a.source.startsWith('game-development/unity/'),
    ),
  );
  for (const a of agents) {
    assert.ok(a.description.length > 10);
    assert.equal('prompt' in a, false);
  }
});
