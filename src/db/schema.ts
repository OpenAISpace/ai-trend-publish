import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, index, uniqueIndex, foreignKey, text, json, timestamp, bigint, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const config = mysqlTable("config", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 255 }),
	value: varchar({ length: 255 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "config_id"}),
]);

export const configMetadata = mysqlTable("config_metadata", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 255 }).notNull(),
	description: text(),
	scope: varchar({ length: 50 }).default("db"),
	isEditable: tinyint("is_editable").default(1),
	category: varchar({ length: 100 }).default("general"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("uq_config_metadata_key").on(table.key),
	primaryKey({ columns: [table.id], name: "config_metadata_id"}),
]);

export const dataSources = mysqlTable("data_sources", {
	id: int().autoincrement().notNull(),
	platform: varchar({ length: 255 }),
	identifier: varchar({ length: 255 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "data_sources_id"}),
]);

export const templateCategories = mysqlTable("template_categories", {
	id: int().autoincrement().notNull(),
	templateId: int("template_id").notNull().references(() => templates.id, { onDelete: "cascade" } ),
	category: varchar({ length: 50 }).notNull(),
},
(table) => [
	index("idx_template_id").on(table.templateId),
	primaryKey({ columns: [table.id], name: "template_categories_id"}),
]);

export const templateVersions = mysqlTable("template_versions", {
	id: int().autoincrement().notNull(),
	templateId: int("template_id").notNull().references(() => templates.id, { onDelete: "cascade" } ),
	version: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	schema: json(),
	changes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: int("created_by"),
},
(table) => [
	index("idx_template_id").on(table.templateId),
	primaryKey({ columns: [table.id], name: "template_versions_id"}),
]);

export const templates = mysqlTable("templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	platform: varchar({ length: 50 }).notNull(),
	style: varchar({ length: 50 }).notNull(),
	content: text().notNull(),
	schema: json(),
	exampleData: json("example_data"),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int("created_by"),
},
(table) => [
	primaryKey({ columns: [table.id], name: "templates_id"}),
]);

export const vectorItems = mysqlTable("vector_items", {
	id: bigint({ mode: "number" }).notNull(),
	content: text(),
	vector: json(),
	vectorDim: int("vector_dim"),
	vectorType: varchar("vector_type", { length: 20 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "vector_items_id"}),
]);

export const prompts = mysqlTable("prompts", {
	id: int().autoincrement().notNull(),
	promptId: varchar("prompt_id", { length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text("content").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("uq_prompt_id").on(table.promptId),
	primaryKey({ columns: [table.id], name: "prompts_id"}),
]);

export const workflowSchedules = mysqlTable("workflow_schedules", {
	id: int().autoincrement().notNull(),
	workflowId: varchar("workflow_id", { length: 255 }).notNull(),
	cron: varchar({ length: 255 }).notNull(),
	timezone: varchar({ length: 100 }).notNull().default("Asia/Shanghai"),
	isEnabled: tinyint("is_enabled").notNull().default(1),
	nextRunAt: timestamp("next_run_at", { mode: "string" }),
	lastRunAt: timestamp("last_run_at", { mode: "string" }),
	lastDurationMs: int("last_duration_ms").default(0),
	avgDurationMs: int("avg_duration_ms").default(0),
	successCount: int("success_count").default(0),
	failureCount: int("failure_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, 
(table) => [
	index("idx_workflow_schedule_workflow").on(table.workflowId),
	uniqueIndex("uq_workflow_schedule_workflow").on(table.workflowId),
	primaryKey({ columns: [table.id], name: "workflow_schedules_id"}),
]);

export const workflowRuns = mysqlTable("workflow_runs", {
	id: varchar({ length: 64 }).notNull(),
	workflowId: varchar("workflow_id", { length: 255 }).notNull(),
	workflowName: varchar("workflow_name", { length: 255 }).notNull(),
	status: varchar({ length: 32 }).notNull(),
	trigger: varchar({ length: 32 }).notNull(),
	payload: json("payload"),
	resultSummary: text("result_summary"),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
	durationMs: int("duration_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "workflow_runs_id"}),
	index("idx_workflow_runs_workflow").on(table.workflowId),
]);

export const workflowRunSteps = mysqlTable("workflow_run_steps", {
	id: int().autoincrement().notNull(),
	runId: varchar("run_id", { length: 64 }).notNull(),
	stepId: varchar("step_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 32 }).notNull(),
	durationMs: int("duration_ms").default(0),
	attempts: int().default(1),
	error: text(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_workflow_run_steps_run").on(table.runId),
	primaryKey({ columns: [table.id], name: "workflow_run_steps_id"}),
]);

export const workflowResults = mysqlTable("workflow_results", {
	id: varchar({ length: 64 }).notNull(),
	workflowId: varchar("workflow_id", { length: 255 }).notNull(),
	workflowName: varchar("workflow_name", { length: 255 }).notNull(),
	status: varchar({ length: 32 }).notNull(),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow().notNull(),
	outputUrl: varchar("output_url", { length: 500 }),
	preview: text(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "workflow_results_id"}),
	index("idx_workflow_results_workflow").on(table.workflowId),
]);
