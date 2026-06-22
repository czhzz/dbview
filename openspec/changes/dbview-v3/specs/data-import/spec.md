## ADDED Requirements

### Requirement: Import from CSV
The system SHALL allow users to import data from CSV files into database tables.

#### Scenario: Select CSV file
- **WHEN** user clicks "Import" → "From CSV" in the DataTable toolbar
- **THEN** an Electron file dialog opens to select a .csv file

#### Scenario: Preview CSV data
- **WHEN** a CSV file is selected
- **THEN** the system SHALL display a preview of the first 20 rows with detected column names, data types, and encoding (UTF-8/GBK/Shift-JIS auto-detection)

#### Scenario: Map columns to table fields
- **WHEN** preview is displayed
- **THEN** the system SHALL show a mapping interface where each CSV column can be mapped to a target table column, or marked as "skip"

#### Scenario: Auto-detect column mapping
- **WHEN** CSV column names match target table column names
- **THEN** the system SHALL auto-map them and highlight any unmapped columns

#### Scenario: Type inference and warning
- **WHEN** the system detects a type mismatch (e.g., CSV value "abc" mapped to INT column)
- **THEN** the system SHALL show a warning with the problematic row/column

#### Scenario: Execute import
- **WHEN** user clicks "Import" after confirming mapping
- **THEN** the system SHALL execute INSERT statements in batches (configurable batch size, default 1000)
- **AND** SHALL show a progress bar with rows imported / total rows

#### Scenario: Import error handling
- **WHEN** an error occurs during import
- **THEN** the system SHALL stop and report the error with the offending row number and content
- **AND** offer options: skip row and continue, retry, or abort

### Requirement: Import from JSON
The system SHALL allow users to import data from JSON files (array of objects format).

#### Scenario: Select and preview JSON
- **WHEN** user clicks "Import" → "From JSON"
- **THEN** an Electron file dialog opens to select a .json file, then preview shows the first 5 objects with detected structure

#### Scenario: JSON array nesting
- **WHEN** the JSON file contains nested objects
- **THEN** the system SHALL flatten them with dot-notation or allow user to select which nested path to import

### Requirement: Import from Excel
The system SHALL allow users to import data from Excel (.xlsx/.xls) files.

#### Scenario: Select Excel file and sheet
- **WHEN** user clicks "Import" → "From Excel"
- **THEN** the file dialog opens and after selection, the system SHALL show a sheet selector if the workbook has multiple sheets

#### Scenario: Excel column mapping
- **WHEN** a sheet is selected
- **THEN** the system SHALL display the same preview and column mapping interface as CSV import

### Requirement: Create new table from import
The system SHALL allow creating a new table based on imported data structure.

#### Scenario: Auto-create table
- **WHEN** the target table does not exist
- **THEN** the system SHALL offer to create a new table with column names and inferred types from the imported data
- **AND** SHALL show the proposed CREATE TABLE DDL for user review before execution
