## ADDED Requirements

### Requirement: Queue rows carry the flavor composition

Each queue row SHALL expose the flavor composition of the order item it represents when that item is a composed pizza — every flavor with its name and fatia count, in the recorded order — so the panel can show exactly what to prepare. Rows for items that are not composed SHALL carry an empty composition.

#### Scenario: A composed pizza row shows its composition
- **WHEN** a queue contains a composed pizza with the recorded composition Mussarela 6 fatias + Chocolate G 2 fatias
- **THEN** the row exposes both entries with their flavor names and fatia counts

#### Scenario: A plain item row carries an empty composition
- **WHEN** a queue row represents an item that is not a composed pizza
- **THEN** the row exposes no composition entries
