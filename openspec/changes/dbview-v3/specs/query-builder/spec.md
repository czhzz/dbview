## ADDED Requirements

### Requirement: Visual query builder interface
The system SHALL provide a drag-and-drop visual query builder that allows users to construct SQL SELECT queries without writing SQL manually.

#### Scenario: Open query builder
- **WHEN** user clicks "Query Builder" button in the SQL editor toolbar
- **THEN** a visual query builder panel opens with available tables and fields from the current database

#### Scenario: Drag table to canvas
- **WHEN** user drags a table from the table list onto the query builder canvas
- **THEN** the table is placed on the canvas with all its columns displayed

#### Scenario: Auto-detect JOIN condition
- **WHEN** user adds a second table that has a foreign key relationship to an existing table
- **THEN** the system SHALL automatically detect the foreign key and add a JOIN line between the two tables

#### Scenario: Manual JOIN configuration
- **WHEN** user drags a field from one table to a field on another table
- **THEN** the system SHALL create a JOIN condition between those two fields, defaulting to INNER JOIN

#### Scenario: Change JOIN type
- **WHEN** user clicks on a JOIN line between two tables
- **THEN** a context menu SHALL appear with options: INNER, LEFT, RIGHT, FULL OUTER, CROSS JOIN

#### Scenario: Select output columns
- **WHEN** user checks a checkbox next to a column name
- **THEN** that column is included in the SELECT clause of the generated SQL

#### Scenario: Add WHERE condition
- **WHEN** user clicks "Add Condition" button in the filter panel
- **THEN** a new filter row is added with fields for column, operator (=, !=, >, <, LIKE, IN, IS NULL, BETWEEN), and value

#### Scenario: Add ORDER BY
- **WHEN** user clicks "Add Sort" in the sort panel
- **THEN** a new sort row is added allowing selection of column and direction (ASC/DESC)

#### Scenario: Add GROUP BY and HAVING
- **WHEN** user selects columns in the GROUP BY section
- **THEN** the system SHALL add GROUP BY clause and enable HAVING condition input

#### Scenario: Preview generated SQL
- **WHEN** user clicks "Preview SQL" button
- **THEN** the system SHALL display the auto-generated SQL in a read-only CodeMirror view

#### Scenario: Execute query from builder
- **WHEN** user clicks "Execute" button in the query builder
- **THEN** the generated SQL is sent to the SQL execution engine and results are displayed in the data grid

#### Scenario: Send SQL to editor
- **WHEN** user clicks "Send to Editor" button
- **THEN** the generated SQL is inserted into the SQL editor for manual refinement

#### Scenario: Save query builder state
- **WHEN** user switches away from the query builder tab
- **THEN** the builder state (tables, joins, filters, sort, selected columns) SHALL be preserved

### Requirement: Support for subqueries and UNION
The system SHALL allow users to create subqueries and UNION queries through the visual builder.

#### Scenario: Add subquery
- **WHEN** user right-clicks on a condition value field and selects "Subquery"
- **THEN** a nested query builder panel opens within the current builder

#### Scenario: Add UNION
- **WHEN** user clicks "Add UNION" button
- **THEN** a second query builder block is added below the current one with UNION ALL as default
