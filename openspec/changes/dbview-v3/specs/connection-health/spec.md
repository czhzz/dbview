## ADDED Requirements

### Requirement: Connection heartbeat monitoring
The system SHALL periodically check the health of active database connections with a configurable heartbeat.

#### Scenario: Heartbeat interval
- **WHEN** a connection is established
- **THEN** the system SHALL send a lightweight heartbeat query (SELECT 1 or equivalent) every 60 seconds by default

#### Scenario: Configurable interval
- **WHEN** user opens connection settings
- **THEN** the heartbeat interval SHALL be configurable (from 10s to 600s, or disabled)

#### Scenario: Heartbeat failure detection
- **WHEN** a heartbeat query fails
- **THEN** the system SHALL retry 2 more times at 5-second intervals
- **AND** if all retries fail, mark the connection as "disconnected"

### Requirement: Auto-reconnect
The system SHALL attempt to automatically reconnect when a connection is lost.

#### Scenario: Auto-reconnect attempt
- **WHEN** a connection is marked as "disconnected"
- **THEN** the system SHALL attempt to reconnect automatically up to 3 times at 10-second intervals

#### Scenario: Reconnect success
- **WHEN** auto-reconnect succeeds
- **THEN** the connection status SHALL be restored to "connected"
- **AND** any active query tabs SHALL be notified that the connection is available again

#### Scenario: Reconnect failure
- **WHEN** all auto-reconnect attempts fail
- **THEN** the system SHALL show a notification: "Connection '<name>' lost. Please reconnect manually."

### Requirement: Connection status visualization
The system SHALL display the health status of each connection in the database tree.

#### Scenario: Status indicator
- **WHEN** a connection is in the database tree
- **THEN** a small colored dot SHALL appear next to the connection name:
  - Green: connected and healthy
  - Yellow: reconnecting
  - Red: disconnected
  - Gray: never connected (saved configuration)

#### Scenario: Status tooltip
- **WHEN** user hovers over the status indicator
- **THEN** a tooltip SHALL show: "Connected" / "Reconnecting (attempt 2/3)" / "Disconnected since HH:MM" / "Not connected"

#### Scenario: Status update on heartbeat
- **WHEN** a heartbeat succeeds after a period of failures
- **THEN** the indicator SHALL update from red to green immediately
