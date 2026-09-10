# Authorization Permissions Specification

## Purpose

Defines which roles may perform each action in the system, so every endpoint has a boundary rule that refuses unauthorized access with a user-readable message.

## Requirements

### Requirement: Every action requires an authenticated user
No endpoint action SHALL execute without an authenticated identity. Requests without one SHALL be refused.

#### Scenario: Unauthenticated request
- **WHEN** a request reaches an endpoint without authentication
- **THEN** the system refuses it

### Requirement: Order creation and item addition
The "Waiter" and "Manager" roles MAY create local and delivery orders and add items to them. The "Cook" role SHALL NOT.

#### Scenario: Cook attempts to create an order
- **WHEN** a user with role "Cook" attempts to create an order
- **THEN** the system refuses with the message "Access not authorized for your profile"

### Requirement: Item preparation
The "Cook" and "Manager" roles MAY start item preparation and confirm an item finished. The "Waiter" role SHALL NOT.

#### Scenario: Waiter attempts to finish an item
- **WHEN** a user with role "Waiter" attempts to confirm an item finished
- **THEN** the system refuses with the message "Access not authorized for your profile"

### Requirement: Item cancellation
The "Waiter" and "Manager" roles MAY cancel items. The "Cook" role SHALL NOT.

#### Scenario: Cook attempts to cancel an item
- **WHEN** a user with role "Cook" attempts to cancel an item
- **THEN** the system refuses with the message "Access not authorized for your profile"

### Requirement: Closing orders
Only the "Manager" role MAY close an order. Any other role SHALL be refused with the message "Only the manager can close the order".

#### Scenario: Waiter attempts to close an order
- **WHEN** a user with role "Waiter" attempts to close an order
- **THEN** the system refuses with the message "Only the manager can close the order"

### Requirement: Earnings report
The system SHALL allow only the "Manager" role to access the daily earnings report.

#### Scenario: Waiter attempts to open the earnings report
- **WHEN** a user with role "Waiter" attempts to access the daily earnings report
- **THEN** access is denied

### Requirement: Kitchen queue
The "Cook" and "Manager" roles MAY view the kitchen queue. The "Waiter" role SHALL NOT.

#### Scenario: Waiter attempts to open the kitchen panel
- **WHEN** a user with role "Waiter" attempts to access the kitchen queue
- **THEN** the system refuses with the message "Access not authorized for your profile"

### Requirement: Ingredient consultation
The ingredient consultation of an item SHALL NOT be available to the "Cook" profile.

#### Scenario: Cook looks for ingredient consultation
- **WHEN** a user with role "Cook" attempts to consult the ingredients of an item
- **THEN** the option is not available to that profile

### Requirement: Manager has access to every profile's functionality
The system SHALL grant the "Manager" role access to the waiter panel, the kitchen panel, the manager panel, and the daily earnings report.

#### Scenario: Manager walks through every panel
- **WHEN** a user with role "Manager" accesses the waiter panel, the kitchen panel, the manager panel, and the earnings report
- **THEN** access is granted to all of them

### Requirement: Refusal message for unauthorized access
Whenever a role is refused an action it is not permitted to perform, the system SHALL show the message "Access not authorized for your profile" unless the action defines a specific message.

#### Scenario: Generic refusal message
- **WHEN** a user is refused an action because of their role and no specific message applies
- **THEN** the message shown is "Access not authorized for your profile"
