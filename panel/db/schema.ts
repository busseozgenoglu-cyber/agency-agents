import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  brief: text('brief').notNull(),
  team: text('team').notNull(),
  status: text('status').notNull().default('queued'),
  cursor: integer('cursor').notNull().default(0),
  total: integer('total').notNull(),
  output: text('output').notNull().default(''),
  error: text('error').notNull().default(''),
  leaseToken: text('lease_token'),
  leaseUntil: integer('lease_until').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id),
    step: integer('step').notNull(),
    agentId: text('agent_id').notNull(),
    agentName: text('agent_name').notNull(),
    phase: text('phase').notNull(),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('messages_project_step').on(table.projectId, table.step),
  ],
);
