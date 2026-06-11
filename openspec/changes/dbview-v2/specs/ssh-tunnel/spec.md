## NEW Requirements

### Background

四种数据库驱动均通过 TCP 直连目标数据库。生产环境数据库通常在内网，需要 SSH 跳板机才能访问。目前 DBView 无法连接 SSH 后的数据库。

### Requirement: SSH 隧道连接

系统 SHALL 支持通过 SSH 隧道连接到远程数据库。

#### Scenario: 通过 SSH 隧道连接 MySQL
- **GIVEN** 用户配置了一个 MySQL 连接
- **WHEN** 用户在连接表单中启用 SSH，填写 SSH 主机、端口、用户名、认证方式
- **THEN** 系统建立 SSH 隧道（本地端口 → 远程数据库端口）
- **AND** 通过隧道连接数据库

#### Scenario: SSH 密钥认证
- **GIVEN** 用户选择 SSH 密钥认证方式
- **WHEN** 用户选择私钥文件路径（可选输入密码短语）
- **THEN** 系统使用该私钥建立 SSH 连接

#### Scenario: SSH 密码认证
- **GIVEN** 用户选择 SSH 密码认证方式
- **WHEN** 用户输入 SSH 密码
- **THEN** 系统使用密码建立 SSH 连接

### Technical Notes

- 使用 `ssh2` 包（纯 JS，无需原生编译）
- ConnectionConfig 类型新增 SSH 配置接口：
  ```typescript
  interface SshConfig {
    enabled: boolean
    host: string
    port: number
    username: string
    authMethod: 'password' | 'key'
    password?: string
    privateKeyPath?: string
    passphrase?: string
  }
  ```
- ConnectionManager 中新增 SSH 隧道管理：
  - 建立连接时检查 SSH 配置，先建立隧道
  - 隧道使用本地随机端口，数据库连接池指向 `127.0.0.1:randomPort`
  - 断开连接时关闭隧道
  - SSH 密码加密存储（复用现有 AES-256-GCM 机制）
- ConnectionForm 新增 SSH 配置折叠面板
- 文件变更：`connection.ts`（类型）、`connection-manager.ts`（隧道管理）、`ConnectionForm.tsx`（UI）
