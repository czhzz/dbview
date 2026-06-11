## NEW Requirements

### Background

项目当前版本号 0.1.0，无 electron-builder 打包配置。只能通过 `pnpm dev` 开发模式运行，无法生成安装包分发给其他用户。缺乏自动更新机制。

### Requirement: 可构建安装包

系统 SHALL 支持通过 electron-builder 构建 Windows NSIS 安装包和 macOS dmg 安装包。

#### Scenario: 构建 Windows 安装包
- **GIVEN** 开发环境为 Windows
- **WHEN** 运行 `pnpm build && electron-builder --win`
- **THEN** 生成 NSIS 安装包（.exe）
- **AND** 安装包包含所有原生模块（better-sqlite3, mysql2, oracledb, pg）

#### Scenario: 构建 macOS 安装包
- **GIVEN** 开发环境为 macOS
- **WHEN** 运行 `pnpm build && electron-builder --mac`
- **THEN** 生成 dmg 安装包
- **AND** 安装包签名（如配置了开发者证书）

### Requirement: 自动更新支持（可选）

系统 SHALL 支持通过 electron-updater 检查 GitHub Releases 的更新。

#### Scenario: 检查更新
- **GIVEN** 用户已安装 DBView
- **WHEN** 应用启动时或用户点击"检查更新"
- **THEN** 检查 GitHub Releases 是否有新版本
- **AND** 如果有新版本，提示用户下载

### Technical Notes

- 配置 `electron-builder.yml`：
  ```yaml
  appId: com.dbview.app
  productName: DBView
  directories:
    output: release
  win:
    target: nsis
    icon: build/icon.ico
  mac:
    target: dmg
    icon: build/icon.icns
  nsis:
    oneClick: false
    allowToChangeInstallationDirectory: true
  ```
- 原生模块需要确保在打包时被正确 include（electron-builder 默认处理）
- electron-vite 的 external 配置已排除原生模块，打包时需确认 asar 解压策略
- 应用图标需放置在 `build/` 目录
