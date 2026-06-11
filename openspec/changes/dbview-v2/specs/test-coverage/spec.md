## NEW Requirements

### Background

整个项目无任何测试（单元测试、集成测试、E2E 测试）。数据库管理工具一旦出错可能造成数据丢失，零测试覆盖是项目的最大风险。

### Requirement: 单元测试覆盖核心逻辑

系统 SHALL 包含针对核心业务逻辑的单元测试，覆盖 DDL 生成、DML 生成、数据导出格式化和 SQL 引用函数。

#### Scenario: DDL 生成测试
- **GIVEN** SchemaEditor.generateDDL 函数
- **WHEN** 传入不同的数据库类型和列配置
- **THEN** 验证生成的 ALTER TABLE 语句符合对应数据库的语法规范
- **AND** 覆盖 MySQL / PostgreSQL / Oracle / SQLite 四种数据库

#### Scenario: DML 生成测试
- **GIVEN** DataTable 的 SQL 构建逻辑（UPDATE / INSERT / DELETE）
- **WHEN** 传入不同的行数据和修改值
- **THEN** 验证生成的 SQL 语句正确（列引用、值转义、WHERE 条件）

#### Scenario: 导出格式化测试
- **GIVEN** formatCSV / formatJSON / formatSQLInsert 函数
- **WHEN** 传入不同的数据集
- **THEN** 验证输出格式正确（CSV 转义、JSON 结构、SQL INSERT 语法）

#### Scenario: SQL 引用测试
- **GIVEN** quoteId / quoteTable 函数
- **WHEN** 传入不同的标识符和数据库类型
- **THEN** 验证引用格式正确（MySQL 的反引号、PG/Oracle/SQLite 的双引号）

### Technical Notes

- 使用 vitest 作为测试框架（与 vite 生态一致，零配置启动）
- 测试文件放置在 `src/__tests__/` 目录，命名 `*.test.ts`
- 配置 `vitest.config.ts`：
  ```typescript
  import { defineConfig } from 'vitest/config'
  export default defineConfig({
    test: { globals: true }
  })
  ```
- 无需 mock Electron 或数据库驱动——被测函数是纯数据转换逻辑
- 运行命令：`pnpm vitest run`
- CI 集成：在 GitHub Actions 中 `pnpm test` 步骤
- 初始目标：核心逻辑覆盖率 >80%
