# Commerce Workflow — Guest Checkout + WhatsApp-Assisted Orders

**Status:** Canonical first-release business workflow. This file complements `architecture.md`; if a generic commerce pattern elsewhere conflicts with this workflow, follow this file.

## 1. Product decision

- No customer registration, customer password, customer login, account profile, address book, or customer-authenticated API.
- Customer browses products, selects variant/size/color/quantity, adds to cart, and checks out as a guest.
- Customer provides recipient name, WhatsApp number, full shipping address and optional delivery notes. Required consent is recorded for transactional WhatsApp notifications.
- Admin controls the configured payment QR and payment instructions.
- Payment is made externally using the configured QR/UPI/bank method. There is no card gateway or automatic payment-provider confirmation in the first release.
- WhatsApp is the primary channel for payment request, screenshot proof, shipping notifications, cancellation requests and refund communication. Admin decisions and verified data are recorded in the website database.

## 2. End-to-end order sequence

### A. Guest checkout

1. Customer adds product variants to cart and enters checkout.
2. Frontend submits variant IDs, quantity, guest contact/address details, consent version, and idempotency key. It does not submit trusted prices or totals.
3. Express reloads product/variant/price/stock from PostgreSQL, validates the request, calculates the subtotal, creates immutable order/item/address snapshots, generates the order number, and creates a high-entropy guest order-access token. Only the token hash is stored.
4. Initial status is `awaiting_admin_review`. Validate current availability, but do not lock stock indefinitely while the admin is reviewing the order. The admin rechecks and atomically reserves stock when issuing the final invoice/payment request. If stock is no longer available, do not request payment; contact the customer and cancel/revise the order.
5. The order is visible in the admin queue. A WhatsApp notification to an allowlisted admin recipient includes order number, customer name/WhatsApp number, item/size/color/quantity summary, subtotal, product image, and a protected admin link. Avoid putting a full delivery address in forwarded notifications by default; display it in the authenticated admin order detail.
6. The confirmation page shows order number, next step, and a private order-status URL. It offers a “Continue in WhatsApp” support link with an order reference as a fallback. Creating the order must succeed even if the WhatsApp app cannot open or the provider is down.

### B. Final bill and payment request

1. Admin checks availability and delivery details.
2. Admin rechecks inventory and atomically reserves the selected variants for the configured payment-hold window. Admin enters shipping cost plus any applicable tax, packaging, discount correction, or other disclosed fee.
3. Backend creates an immutable invoice version containing line items and their price snapshots, subtotal, discounts, tax, shipping, other fees, total, currency (`INR`), creator, and timestamp.
4. Admin confirms the amount and presses **Send payment QR**. The backend records the request and queues WhatsApp delivery of the bill summary and QR image/instructions.
5. When a business-initiated message is required, the WhatsApp adapter must use an approved template (possibly a media-header template) for which the customer has opted in. A website checkout submission alone does not open the customer-service window. Provider/template failure must show in the admin queue and must not delete/roll back the saved order.
6. Order status becomes `awaiting_customer_payment` only after a valid final invoice/payment request is recorded. Invoice versions are immutable; if amount changes, create a new version and clearly tell the customer which version supersedes the old one. Obtain approval before requesting any extra amount.

### C. Customer pays and sends screenshot

1. Customer scans/pays using the QR/UPI/bank instructions.
2. Customer sends a screenshot/receipt to the business WhatsApp, ideally replying in the order conversation or including the order number.
3. Express verifies WhatsApp webhook authenticity, deduplicates provider message IDs, stores screenshot media in private storage, and creates a `payment_proof` record.
4. If the order match is ambiguous, the bot asks for the order number/reference and does not attach the image to an arbitrary order.
5. Status becomes `payment_proof_received` / `payment_under_review`, never `paid` merely because a screenshot arrived.
6. Admin checks the actual bank/UPI transaction record, verifies the amount and transaction reference/UTR, then presses **Verify payment** and records amount, reference, admin ID and timestamp. Duplicate/mismatched transfers are flagged for review.

### D. Shipping and final billing

1. Only a verified-paid order can move to processing/ready-to-ship.
2. Admin records courier, tracking number, tracking URL, shipment timestamp and any relevant dispatch note.
3. Backend stores shipment state and queues an order/shipping update through WhatsApp. Where no session is open, use an approved utility template as required by current platform rules.
4. Customer can open a private token-protected status URL to view order state, latest invoice and tracking. The order number alone cannot grant access.
5. The final invoice clearly itemizes products, discounts, tax if applicable, shipping and other fees. Charges known before payment must be included before the QR is sent. Unforeseen charges require a revised bill and customer approval before a new amount is requested.

## 3. Cancellation workflow

Sources: customer presses **Request cancellation** on the private order-status page, or sends/chooses the WhatsApp cancellation intent.

Both paths call the same `CancellationService` and create a `cancellation_requests` record with source, order, request timestamp and reason. Guest status tokens must be high-entropy, scoped, expire/revoke safely, be stored only as hashes, and never be logged; the status page is noindex/no-referrer and must not load third-party analytics.

- Unpaid + not shipped: may be auto-cancelled under policy after confirming the order and customer intent; if a payment-hold reservation exists, release it exactly once.
- Payment proof received / payment under review: route to admin so an incoming transfer is not overlooked.
- Paid / processing: admin review required. If approved, record the order cancellation and separately initiate/record a refund.
- Shipped/delivered: do not label as a cancellation; route to the return/refund policy workflow for admin review.
- Website cancellation action requires a valid private order token; order number alone is not sufficient.
- Send a WhatsApp confirmation/status message using an allowed free-form reply inside the customer-service window or an approved template outside it. Record message IDs and send status.

A free-text classifier may suggest intent but is not authority to cancel. Use explicit interactive actions or a confirmation message before state-changing operations.

## 4. Refund workflow

1. Customer sends a WhatsApp refund request or responds to a support flow.
2. Bot verifies/matches the order, asks for a reason and any required context, and creates `refund_requested`. If multiple orders match the number, ask which order. Provide a clear human escalation route.
3. Admin reviews order status, fulfillment/return policy, prior refunds and refundable amount. No automatic refund approval or automatic transfer occurs.
4. Once the business performs the agreed manual UPI/bank refund outside the website, the admin records refund amount, currency, method, transaction reference, reason, date and operator, then marks it `refunded` (or partial).
5. Backend updates the order/payment summary in an audited transaction and sends the refund status by WhatsApp. It must not claim a refund has been paid until the admin records the actual transfer confirmation.
6. Stock is restored only when the policy says the returned item has been received/inspected and is sellable again; never restock only because a refund request was created.

## 5. Order state machine

```text
awaiting_admin_review
        | admin confirms stock + final itemized invoice
        v
awaiting_customer_payment
        | screenshot received
        v
payment_under_review
        | admin checks bank/UPI transaction independently
        v
paid -> processing -> shipped -> delivered
  |          |            |
  |          |            +--> return/refund request (admin review)
  |          +--> cancellation review (admin decision)
  +--> cancellation/refund review if requested

awaiting_admin_review / awaiting_customer_payment
        +--> cancelled (eligible unpaid cancellation; release stock hold)

Any refund request remains a request until an admin decision and an actual manual transfer are recorded.
```

This is a concept diagram; the implementation must maintain distinct order, payment and shipment state fields and validate allowed transitions with unit tests.

## 6. WhatsApp automation requirements

- Provider adapter must support sending text, image/media, approved templates, inbound webhook events, and message-delivery status events, or explicitly expose unsupported capabilities.
- Verify webhook challenge/signature per the selected provider's current documentation; deduplicate message/event IDs and process retry delivery idempotently.
- Store only necessary message content/metadata. Keep payment screenshots and customer address data private, access-controlled and under a documented retention policy.
- Never log access tokens, full message payloads, full addresses, payment screenshots, or secrets.
- Use allowed templates for business-initiated/out-of-window sends. Collect opt-in for transactional messages. Templates, pricing, and platform terms must be confirmed during provider setup.
- Make admin notifications resilient: if WhatsApp send fails, order remains in admin dashboard with a visible retry/manual-follow-up state.
- Include explicit `Talk to a person`/support escalation.
- AI/NLP may classify cancellation/refund/tracking intents but must not independently approve, cancel, mark paid, alter an invoice or execute a refund.

## 7. Core entities

- `GuestCart` / `GuestCartItem`
- `Order` / `OrderItem` (snapshots; normalized WhatsApp number; shipping address; consent)
- `GuestOrderAccessToken` (hash, scoped actions, expiry/revocation)
- `Invoice` / `InvoiceLine` (immutable versioned billing)
- `ManualPayment` / `PaymentProof` (private proof and admin verification audit)
- `Shipment` (courier and tracking details)
- `CancellationRequest` / `RefundRequest` / `RefundRecord`
- `WhatsAppConversation` / `WhatsAppMessage` / `WhatsAppWebhookEvent`
- `StoreSetting` for the configured QR and payment instructions
- `AuditEvent` / `OutboxEvent`

## 8. Acceptance checklist

- [ ] Customer can purchase as guest with no register/login step.
- [ ] Checkout captures WhatsApp number, full address and transactional-message consent.
- [ ] Product image and order summary are visible in the admin order notification or queued for retry; admin can always find the order in the dashboard.
- [ ] Admin can upload/update the QR and payment instructions.
- [ ] Admin can create a versioned itemized final bill and add shipping/other charges before sending the QR.
- [ ] Order/payment request message and QR are sent through the configured WhatsApp adapter using allowed messaging/template rules.
- [ ] Customer screenshot arrives through webhook and is stored privately.
- [ ] Screenshot receipt does not automatically mark payment as paid.
- [ ] Admin verifies the bank/UPI transaction and records amount/reference before dispatch.
- [ ] Admin can add carrier/tracking details and send a WhatsApp update.
- [ ] Website and WhatsApp cancellation requests share one service and are audited.
- [ ] Refund requests are handled via WhatsApp, reviewed by admin, and only marked refunded after actual manual transfer is recorded.
- [ ] Invalid/expired guest token cannot access an order; order number alone is not sufficient.
- [ ] Unavailable/failed WhatsApp provider never loses order data and surfaces an admin retry/follow-up state.
- [ ] WhatsApp templates, opt-in, webhook verification, retention, and human escalation are verified before production.

## 9. Official references to re-check during implementation

- [WhatsApp Business Platform policy](https://whatsappbusiness.com/policy/)
- [Meta WhatsApp Business Platform Messages API collection](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages)
- [WhatsApp order details and summaries](https://faq.whatsapp.com/1249073475657215)

Platform requirements can change. Do not assume that customer phone capture alone grants permission to send messages or that a website submission opens a WhatsApp service window.
