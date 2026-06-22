## ADDED Requirements

### Requirement: Configurable keyboard shortcuts
The system SHALL provide a UI for viewing and customizing all keyboard shortcuts.

#### Scenario: Open shortcut settings
- **WHEN** user clicks "Settings" → "Keyboard Shortcuts" (or presses Ctrl+Shift+K)
- **THEN** the shortcut configuration dialog opens showing all available commands grouped by category (Editor, Navigation, Data, Query, General)

#### Scenario: Change shortcut binding
- **WHEN** user clicks on a shortcut entry and presses a new key combination
- **THEN** the shortcut SHALL be updated to the new binding
- **AND** if the new combination conflicts with an existing shortcut, the system SHALL display a warning showing the conflict

#### Scenario: Reset to default
- **WHEN** user clicks "Reset to Default" button
- **THEN** all shortcuts SHALL be restored to their original bindings

#### Scenario: Export/Import shortcuts
- **WHEN** user clicks "Export"
- **THEN** the system SHALL save the current shortcut configuration as a JSON file
- **WHEN** user clicks "Import"
- **THEN** the file dialog opens to load a previously exported JSON shortcut config

### Requirement: Default shortcuts
The system SHALL ship with a sensible set of default keyboard shortcuts.

#### Scenario: Editor shortcuts
- **WHEN** user presses Ctrl+Enter in the SQL editor
- **THEN** the current SQL SHALL be executed
- **WHEN** user presses Ctrl+Shift+Enter
- **THEN** only the selected SQL text SHALL be executed
- **WHEN** user presses Ctrl+Shift+F
- **THEN** the SQL SHALL be formatted
- **WHEN** user presses Ctrl+Shift+E
- **THEN** EXPLAIN SHALL be run on the current SQL

#### Scenario: Navigation shortcuts
- **WHEN** user presses Ctrl+Tab
- **THEN** the next tab SHALL be activated
- **WHEN** user presses Ctrl+Shift+Tab
- **THEN** the previous tab SHALL be activated
- **WHEN** user presses Ctrl+W
- **THEN** the current tab SHALL be closed
- **WHEN** user presses Ctrl+T
- **THEN** a new SQL editor tab SHALL be opened

#### Scenario: Data shortcuts
- **WHEN** user presses Ctrl+Shift+E (from DataTable)
- **THEN** the data SHALL be exported
- **WHEN** user presses Ctrl+S (from editable DataTable)
- **THEN** pending edits SHALL be saved

#### Scenario: General shortcuts
- **WHEN** user presses Ctrl+`
- **THEN** the sidebar (database tree) SHALL be toggled
- **WHEN** user presses Ctrl+,
- **THEN** the settings panel SHALL be opened

### Requirement: Shortcut persistence
Shortcut customizations SHALL persist across application restarts.

#### Scenario: Save to disk
- **WHEN** user modifies a shortcut binding
- **THEN** the change SHALL be persisted to a JSON file in the app's userData directory

#### Scenario: Load on startup
- **WHEN** the application starts
- **THEN** the system SHALL load the saved shortcut configuration and apply it
