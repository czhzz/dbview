import { describe, it, expect } from 'vitest'
import { generateColumnDDL, generateIndexDDL, buildCommentSql, type ColumnFormValues } from '../ddl-generator'

const baseAdd: ColumnFormValues = {
  name: 'email',
  type: 'VARCHAR',
  length: 255,
  nullable: true,
  defaultValue: undefined,
  comment: ''
}

describe('generateColumnDDL — add mode', () => {
  it('MySQL: ADD COLUMN with backtick quoting and inline COMMENT', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, comment: 'user email' },
      'add',
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe(
      "ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) COMMENT 'user email';"
    )
  })

  it('PostgreSQL: ADD COLUMN + separate COMMENT ON COLUMN statement', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, comment: 'user email' },
      'add',
      'users',
      'public',
      'postgresql'
    )
    expect(ddl).toBe(
      'ALTER TABLE "public"."users" ADD COLUMN "email" VARCHAR(255);\n' +
        "COMMENT ON COLUMN \"public\".\"users\".\"email\" IS 'user email';"
    )
  })

  it('Oracle: ADD COLUMN + COMMENT ON COLUMN with schema-qualified quoting', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, comment: 'user email' },
      'add',
      'users',
      'scott',
      'oracle'
    )
    expect(ddl).toBe(
      'ALTER TABLE "scott"."users" ADD COLUMN "email" VARCHAR(255);\n' +
        "COMMENT ON COLUMN \"scott\".\"users\".\"email\" IS 'user email';"
    )
  })

  it('SQLite: ADD COLUMN, no comment support (comment silently skipped)', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, comment: 'user email' },
      'add',
      'users',
      undefined,
      'sqlite'
    )
    expect(ddl).toBe('ALTER TABLE "users" ADD COLUMN "email" VARCHAR(255);')
  })

  it('emits NOT NULL when nullable is false', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, nullable: false },
      'add',
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe('ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) NOT NULL;')
  })

  it('emits DEFAULT clause when defaultValue is set', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, defaultValue: '0' },
      'add',
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe('ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) DEFAULT 0;')
  })

  it('omits length when not provided', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, length: undefined },
      'add',
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe('ALTER TABLE `users` ADD COLUMN `email` VARCHAR;')
  })

  it('escapes single quotes in MySQL COMMENT', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, comment: "user's email" },
      'add',
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toContain("COMMENT 'user''s email'")
  })
})

describe('generateColumnDDL — edit mode', () => {
  it('MySQL: MODIFY COLUMN with inline COMMENT', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, comment: 'updated' },
      'edit',
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe(
      "ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(255) COMMENT 'updated';"
    )
  })

  it('PostgreSQL: ALTER COLUMN SET DATA TYPE / SET NOT NULL / SET DEFAULT + COMMENT', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd, nullable: false, defaultValue: 'now()', comment: 'c' },
      'edit',
      'users',
      'public',
      'postgresql'
    )
    expect(ddl).toBe(
      'ALTER TABLE "public"."users" ALTER COLUMN "email" SET DATA TYPE VARCHAR(255);\n' +
        'ALTER TABLE "public"."users" ALTER COLUMN "email" SET NOT NULL;\n' +
        'ALTER TABLE "public"."users" ALTER COLUMN "email" SET DEFAULT now();\n' +
        "COMMENT ON COLUMN \"public\".\"users\".\"email\" IS 'c';"
    )
  })

  it('SQLite edit falls back to ADD COLUMN (no comment support)', () => {
    const ddl = generateColumnDDL(
      { ...baseAdd },
      'edit',
      'users',
      undefined,
      'sqlite'
    )
    expect(ddl).toBe('ALTER TABLE "users" ADD COLUMN "email" VARCHAR(255);')
  })
})

describe('generateIndexDDL', () => {
  it('generates a plain CREATE INDEX', () => {
    const ddl = generateIndexDDL(
      { name: 'idx_email', columns: ['email'], unique: false },
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe('CREATE INDEX `idx_email` ON `users` (`email`);')
  })

  it('generates a UNIQUE index', () => {
    const ddl = generateIndexDDL(
      { name: 'uk_email', columns: ['email'], unique: true },
      'users',
      undefined,
      'mysql'
    )
    expect(ddl).toBe('CREATE UNIQUE INDEX `uk_email` ON `users` (`email`);')
  })

  it('quotes multiple columns', () => {
    const ddl = generateIndexDDL(
      { name: 'idx_multi', columns: ['a', 'b'], unique: false },
      'users',
      'public',
      'postgresql'
    )
    expect(ddl).toBe('CREATE INDEX "idx_multi" ON "public"."users" ("a", "b");')
  })
})

describe('buildCommentSql', () => {
  it('Oracle uses schema.table.column with double quotes', () => {
    expect(buildCommentSql('users', 'scott', 'email', 'c', 'oracle')).toBe(
      'COMMENT ON COLUMN "scott"."users"."email" IS \'c\''
    )
  })

  it('PostgreSQL uses quoteTable.quoteId form', () => {
    expect(buildCommentSql('users', 'public', 'email', 'c', 'postgresql')).toBe(
      'COMMENT ON COLUMN "public"."users"."email" IS \'c\''
    )
  })

  it('escapes single quotes in the comment text', () => {
    expect(buildCommentSql('users', undefined, 'email', "a'b", 'postgresql')).toBe(
      'COMMENT ON COLUMN "users"."email" IS \'a\'\'b\''
    )
  })
})
