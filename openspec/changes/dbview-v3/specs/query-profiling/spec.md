## ADDED Requirements

### Requirement: EXPLAIN visualization
The system SHALL visualize EXPLAIN output as an interactive execution plan tree.

#### Scenario: Explain a query
- **WHEN** user selects a SQL query in the editor and clicks "Explain" button (or Ctrl+Shift+E)
- **THEN** the system SHALL execute EXPLAIN (or EXPLAIN ANALYZE for PostgreSQL) on the query and display the execution plan

#### Scenario: Display plan tree
- **WHEN** the execution plan is returned
- **THEN** the system SHALL render it as a top-down tree diagram where:
  - Each node represents an operation (Seq Scan, Index Scan, Nested Loop, Hash Join, Sort, Aggregate, etc.)
  - Node color indicates relative cost (green=cheap, yellow=moderate, red=expensive)
  - Each node displays: operation name, estimated rows, estimated cost, actual rows (if ANALYZE), actual time (if ANALYZE)

#### Scenario: Expand node details
- **WHEN** user clicks on a plan node
- **THEN** a detail panel opens showing full node properties: startup cost, total cost, plan rows, plan width, filter conditions, index name, join type, etc.

#### Scenario: Highlight expensive nodes
- **WHEN** the plan tree is rendered
- **THEN** nodes consuming more than 50% of the total query cost SHALL be highlighted with a warning indicator

### Requirement: Slow query analysis
The system SHALL collect and display slow-running queries from the current session.

#### Scenario: Show slow query log
- **WHEN** user opens the "Slow Queries" panel
- **THEN** the system SHALL display queries that took longer than a configurable threshold (default 1 second), sorted by duration descending

#### Scenario: Analyze slow query
- **WHEN** user clicks "Analyze" on a slow query entry
- **THEN** the system SHALL run EXPLAIN on the query and show the execution plan visualization

### Requirement: Index suggestions
The system SHALL suggest indexes based on query patterns and EXPLAIN output.

#### Scenario: Suggest missing index
- **WHEN** EXPLAIN output shows a Seq Scan on a large table with WHERE conditions
- **THEN** the system SHALL suggest a CREATE INDEX statement covering the filtered columns

#### Scenario: Show index usage
- **WHEN** user views the index list for a table
- **THEN** the system SHALL display each index's estimated usage statistics (if available from the database)

#### Scenario: Duplicate index detection
- **WHEN** analyzing table indexes
- **THEN** the system SHALL flag potentially redundant or duplicate indexes
