# Orders Listing Specification

## Purpose

Defines what the orders listing returns, so the screens that read it — the waiter's order detail and the manager's delivery list and detail — resolve the same set of orders the floor view considers live.

## Requirements

### Requirement: Orders listing scope

The orders listing MUST return every order created on the requested day, whatever its status, together with every order still in progress regardless of the day it was created on. An order is in progress while it is a local order with status "Open", or a delivery order whose status is "Open", "Preparing" or "Out for delivery". An order that was both created and completed before the requested day MUST NOT appear: the financial record of a day's trade is the day-sales report, which keys on the completion timestamps, not the listing.

#### Scenario: An order left open overnight stays listed
- **WHEN** a local order created on the previous day is still "Open"
- **THEN** the listing for the current day includes it

#### Scenario: A delivery still in its cycle from an earlier day stays listed
- **WHEN** a delivery order created on the previous day has status "Preparing" or "Out for delivery"
- **THEN** the listing for the current day includes it

#### Scenario: An earlier day's completed orders stay out of the listing
- **WHEN** an order created on the previous day has status "Closed" or "Delivered"
- **THEN** the listing for the current day does not include it

#### Scenario: The day's own orders are listed whatever their status
- **WHEN** the listing is requested for a day on which orders were created and already completed
- **THEN** those orders are included alongside the ones still in progress

### Requirement: The floor view and the listing share one definition of in progress

The set of open orders behind the floor view MUST be derived from the same definition of "in progress" as the orders listing. A table presented as occupied MUST carry an order that the listing returns, so that the order's detail is reachable from a table shown as occupied and the table can be freed.

#### Scenario: A table occupied by an earlier day's open order is reachable
- **WHEN** a table's open order was created on a previous day
- **THEN** the floor view presents the table as occupied and the listing contains that order, so its detail resolves

#### Scenario: The two views agree on every open order
- **WHEN** the floor view reports a table as occupied
- **THEN** the order it carries is present in the listing for the current day
