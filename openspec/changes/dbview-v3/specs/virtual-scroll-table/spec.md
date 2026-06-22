## ADDED Requirements

### Requirement: Virtual scrolling for large datasets
The system SHALL use virtual scrolling to render large datasets efficiently, replacing the current page-based DataTable mode for query results.

#### Scenario: Load large result set
- **WHEN** a query returns more than 1,000 rows
- **THEN** the DataTable SHALL switch to virtual scroll mode automatically, rendering only visible rows

#### Scenario: Smooth scroll performance
- **WHEN** user scrolls through a result set of up to 100,000 rows
- **THEN** the table SHALL maintain 60fps scrolling with no visible lag

#### Scenario: Row count display
- **WHEN** virtual scroll mode is active
- **THEN** the table footer SHALL display total row count and "Virtual Scroll" indicator

#### Scenario: Toggle between modes
- **WHEN** user clicks a "Pagination Mode" toggle button
- **THEN** the table SHALL switch back to the traditional page-based mode

### Requirement: Column freeze
The system SHALL allow users to freeze (lock) columns on the left side of the table.

#### Scenario: Freeze first N columns
- **WHEN** user right-clicks a column header and selects "Freeze Columns Up to Here"
- **THEN** all columns from the leftmost up to and including the clicked column SHALL be frozen and remain visible during horizontal scrolling

#### Scenario: Unfreeze columns
- **WHEN** user right-clicks a frozen column header and selects "Unfreeze All"
- **THEN** all frozen columns SHALL be released

#### Scenario: Visual indicator
- **WHEN** columns are frozen
- **THEN** a vertical divider line SHALL separate frozen and scrollable areas

### Requirement: Batch copy
The system SHALL support batch copying of cell values and rows.

#### Scenario: Copy single cell
- **WHEN** user selects a cell and presses Ctrl+C
- **THEN** the cell value SHALL be copied to clipboard as plain text

#### Scenario: Copy selected rows
- **WHEN** user selects multiple rows (via checkbox or Shift+click) and presses Ctrl+C
- **THEN** the selected rows SHALL be copied as tab-separated values (for paste into Excel) and as JSON (for paste into code)

#### Scenario: Copy with headers
- **WHEN** user copies rows with Ctrl+Shift+C
- **THEN** column headers SHALL be included as the first row in the clipboard output

#### Scenario: Select all rows
- **WHEN** user presses Ctrl+A in virtual scroll mode
- **THEN** all rows (not just visible ones) SHALL be selected for batch operations

### Requirement: Column resize and reorder
The system SHALL support column width resize and column reorder via drag-and-drop.

#### Scenario: Resize column
- **WHEN** user drags the right border of a column header
- **THEN** the column width SHALL adjust and persist for the session

#### Scenario: Reorder column
- **WHEN** user drags a column header left or right
- **THEN** the column SHALL move to the new position visually (client-side only, does not affect SQL ORDER BY)
