## MODIFIED Requirements

### Requirement: Present only the item itself on each tile

Each tile MUST show the item name, its quantity, its status label and a background color indicating the status, the item's notes when it has any, and the flavor composition when the item is a composed pizza — each flavor with its share of the pizza ("Mussarela 1/2 · Chocolate 1/4" wording, or fatias on the M where fractions are not clean). A tile MUST NOT show any order-level information — no table number, no customer name, no order or item identifiers.

#### Scenario: Tile contents
- **WHEN** a Cook views a queue containing a preparation item that carries notes
- **THEN** the tile shows the item name, quantity, status and the notes, colored by its status

#### Scenario: Composed pizza tile shows its composition
- **WHEN** a Cook views a queue containing a composed pizza
- **THEN** the tile shows each flavor of the composition with its share of the pizza, colored by its status, alongside the item name and quantity

#### Scenario: Tiles stay anonymous
- **WHEN** a Cook views any tile in either queue
- **THEN** no table number, customer name or order identifier is visible anywhere in the panel
