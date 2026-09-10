## ADDED Requirements

### Requirement: Panel action to cancel preparation
For a queue item the panel SHALL offer a "Cancelar preparo" action while the item is "Preparing". Cancelling SHALL be a plain confirmation — no reason is asked for or sent — and SHALL remove the acted order item from the queue and the order. The action SHALL be refused when the acting profile may not perform it: a Cook or a Manager may cancel; a Waiter SHALL be refused with the message "Access not authorized for your profile". Items whose status is "Pending" SHALL NOT offer the panel cancel action (their cancellation stays with the order-side flow).

#### Scenario: Cook cancels one of two dishes in preparation
- **WHEN** a Cook starts two identical "Calabresa" lines and then cancels the first through the plain confirmation
- **THEN** the first line leaves the queue and the order, the order history records the cancellation, and the second line stays "Preparing" in its arrival position

#### Scenario: Waiter is refused the panel cancel action
- **WHEN** a Waiter profile attempts to cancel a queue item in preparation
- **THEN** the system refuses the action with the message "Access not authorized for your profile"
