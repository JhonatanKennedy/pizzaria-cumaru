# Delivery Status Specification

## Purpose

Defines the delivery order lifecycle at the order level: the Preparing → Out for delivery → Delivered cycle, its transition rules, and the delivery timestamp.

## Requirements

### Requirement: Delivery status cycle
A delivery order SHALL move through the statuses "Open", "Preparing", "Out for delivery", and "Delivered", strictly in that order.

#### Scenario: The full cycle
- **WHEN** a delivery order with status "Open" is marked as "Preparing", then marked as "Out for delivery", then marked as "Delivered"
- **THEN** the order status becomes "Preparing", then "Out for delivery", then "Delivered"

### Requirement: Delivery time on arrival
The system SHALL record the delivery time on the order when a delivery order is marked as "Delivered".

#### Scenario: Order delivered
- **WHEN** a delivery order with status "Out for delivery" is marked as "Delivered"
- **THEN** the delivery time is recorded in the order

### Requirement: Strictly sequential transitions
Marking a delivery order with a status that skips a step, repeats a step, or goes backwards SHALL be refused.

#### Scenario: Skipping a step
- **WHEN** a delivery order with status "Open" is marked as "Delivered"
- **THEN** the system refuses the operation with the message "Invalid delivery status transition"

#### Scenario: Changing a delivered order
- **WHEN** a delivery order with status "Delivered" is marked as "Out for delivery"
- **THEN** the system refuses the operation with the message "Invalid delivery status transition"

### Requirement: Local orders never enter the delivery cycle
The delivery cycle SHALL apply only to orders of type "Delivery". Marking a local order with a delivery-cycle status SHALL be refused.

#### Scenario: Local order marked for delivery
- **WHEN** a local order is marked as "Preparing"
- **THEN** the system refuses the operation with the message "Only delivery orders can enter the delivery cycle"

### Requirement: In-cycle orders stay in the kitchen queue
A delivery order that is "Preparing" or "Out for delivery" SHALL keep appearing in the kitchen queues as long as it has items awaiting or in preparation.

#### Scenario: Preparing order still queued
- **WHEN** a delivery order with a "Pending" item is marked as "Preparing"
- **THEN** the order still appears in the "Delivery" kitchen queue with that item
