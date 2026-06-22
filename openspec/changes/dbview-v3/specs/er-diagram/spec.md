## ADDED Requirements

### Requirement: Auto-generate ER diagram from schema
The system SHALL automatically generate an entity-relationship diagram from the selected database's schema.

#### Scenario: Open ER diagram
- **WHEN** user clicks "ER Diagram" button in the database tree toolbar or right-click menu on a database
- **THEN** the system SHALL render an ER diagram showing all tables as boxes with their columns, primary keys, foreign keys, and relationships

#### Scenario: Display table entity
- **WHEN** a table is rendered in the ER diagram
- **THEN** it SHALL display the table name in bold, primary key fields with a key icon, and all other columns below
- **AND** column types SHALL be shown in lighter text next to each column name

#### Scenario: Show relationships
- **WHEN** a foreign key relationship exists between two tables
- **THEN** the system SHALL draw a connector line between the referencing column and the referenced column
- **AND** the line SHALL indicate cardinality (1:1, 1:N, N:M) with appropriate markers

#### Scenario: Zoom and pan
- **WHEN** user scrolls on the diagram
- **THEN** the diagram SHALL zoom in/out
- **WHEN** user clicks and drags on empty space
- **THEN** the diagram SHALL pan

#### Scenario: Click table to navigate
- **WHEN** user clicks on a table in the ER diagram
- **THEN** the system SHALL open the table structure view (StructurePage) for that table

#### Scenario: Focus on table
- **WHEN** user double-clicks a table in the ER diagram
- **THEN** the diagram SHALL zoom to center on that table

#### Scenario: Toggle column visibility
- **WHEN** user right-clicks on a table entity and selects "Show/Hide Columns"
- **THEN** a submenu allows toggling display of column types, foreign key indicators, or hiding columns entirely

### Requirement: Layout management
The system SHALL provide automatic and manual layout options for the ER diagram.

#### Scenario: Auto-layout
- **WHEN** user clicks "Auto Layout" button
- **THEN** the system SHALL rearrange all tables using a force-directed or layered graph layout algorithm

#### Scenario: Manual reposition
- **WHEN** user drags a table to a new position on the canvas
- **THEN** the table SHALL stay in that position until auto-layout is triggered again

#### Scenario: Save layout
- **WHEN** user closes the ER diagram tab
- **THEN** the current layout positions SHALL be persisted so they are restored when reopening

### Requirement: Filter diagram scope
The system SHALL allow users to filter which tables appear in the ER diagram.

#### Scenario: Filter by table name
- **WHEN** user types in a search box above the diagram
- **THEN** only tables whose names match the search text SHALL be displayed

#### Scenario: Show related tables only
- **WHEN** user right-clicks a table and selects "Show Related"
- **THEN** only the selected table and its direct relationship neighbors SHALL be shown

#### Scenario: Show all tables
- **WHEN** user clicks "Show All"
- **THEN** all tables in the database SHALL be displayed on the diagram
