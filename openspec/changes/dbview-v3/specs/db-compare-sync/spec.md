## ADDED Requirements

### Requirement: Compare database schemas
The system SHALL allow users to compare the structure (tables, columns, indexes, constraints) between two databases or between a database and a DDL script file.

#### Scenario: Select comparison sources
- **WHEN** user opens the Database Compare dialog
- **THEN** the system SHALL present two panels to select: left source (a connected database) and right source (another database or a .sql DDL file)

#### Scenario: Run structure comparison
- **WHEN** user clicks "Compare" with both sources selected
- **THEN** the system SHALL analyze both sources and display a diff view showing:
  - Tables present only in source A (added)
  - Tables present only in source B (removed)
  - Tables present in both but with differences (modified)
  - Identical tables (can be hidden)

#### Scenario: Show column-level diff
- **WHEN** user expands a modified table
- **THEN** the system SHALL show per-column differences: added/removed/changed columns with old and new type/nullable/default values

#### Scenario: Show index-level diff
- **WHEN** user expands a modified table's index section
- **THEN** the system SHALL show added/removed/changed indexes with details

### Requirement: Generate migration script
The system SHALL generate an ALTER DDL script to synchronize the target database to match the source.

#### Scenario: Generate migration SQL
- **WHEN** user clicks "Generate Migration Script" after a comparison
- **THEN** the system SHALL produce a DDL script that, when executed, makes the target database structure match the source

#### Scenario: Preview migration SQL
- **WHEN** migration script is generated
- **THEN** the system SHALL display the DDL in a CodeMirror preview panel for review before execution

#### Scenario: Execute migration
- **WHEN** user clicks "Execute Migration" after reviewing
- **THEN** the system SHALL execute the DDL script against the target database
- **AND** SHALL report success/failure for each statement

#### Scenario: Dry run
- **WHEN** user checks "Dry Run" before executing
- **THEN** the system SHALL simulate the migration and report what would change without making actual modifications

### Requirement: Compare data
The system SHALL allow row-level data comparison between two tables with the same schema.

#### Scenario: Select tables for data comparison
- **WHEN** user navigates to the Data Compare tab and selects two tables (from different databases, same structure)
- **THEN** the system SHALL compare rows based on primary key

#### Scenario: Display data differences
- **WHEN** data comparison completes
- **THEN** the system SHALL display three groups: rows only in source (to insert), rows only in target (to delete), rows with different values (to update)

#### Scenario: Generate data sync script
- **WHEN** user clicks "Generate Sync Script" after data comparison
- **THEN** the system SHALL generate INSERT/UPDATE/DELETE statements to synchronize data
