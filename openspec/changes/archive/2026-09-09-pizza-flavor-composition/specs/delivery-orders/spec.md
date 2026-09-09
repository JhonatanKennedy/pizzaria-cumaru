## Purpose

The manager's delivery-order flow: register WhatsApp delivery orders and manage their items over the course of the delivery — including composing pizzas with pieces of multiple flavors just as in the local table flow.

## ADDED Requirements

### Requirement: Composing flavors when adding a pizza to a delivery order

The delivery add-items panel MUST offer the same pizza composition as the waiter's table flow: a pizza in its size (M = 6 fatias, G = 8 fatias) MAY be composed by splitting its canvas among other available pizza flavors of the same size, the selected pizza keeping the remainder. The recorded composition and the price follow the backend's rules, and backend refusals MUST be displayed verbatim.

#### Scenario: Composing a pizza on a delivery order
- **WHEN** the manager selects a G pizza for a delivery order and gives 2 fatias of it to an available same-size pizza flavor
- **THEN** the added item records the composition and the price follows the backend's multi-flavor rule

#### Scenario: Unavailable flavors are not offered for composing
- **WHEN** a pizza is selected and the manager starts composing it on a delivery order
- **THEN** the flavor picker offers only PIZZA items of the same size that are available

### Requirement: Delivery order lines show the composition

The delivery order detail MUST render a composed pizza line with its composition, using the same wording as the waiter's order detail.

#### Scenario: Delivery line of a composed pizza
- **WHEN** a delivery order contains a composed pizza
- **THEN** its line shows the pizza name and each flavor with its share of the pizza
