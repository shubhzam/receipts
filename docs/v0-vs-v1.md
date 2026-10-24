# v0 vs v1 replies

ten cases, v0 is the plain one-shot prompt, v1 is the checklist decision plus a fact-checked write-up.

## d01 - fraud, $39.00, ground truth: merchant should win

customer claim: I did not make this purchase. I don't recognise this charge on my card and want my money back.

checklist decision: DISPUTE (rule fraud_all_three_hold)

- email_match [present]: purchase email and account email are both alex.rivera@example.com
- access_after_purchase [present]: 11 logins over 6 days from the purchase IP address and device
- country_match [present]: purchase IP address and cardholder are both in United States

### v0 (149 words)

Dear Dispute Reviewer,

We are contesting the dispute on order ORD-1101 for $39.00. The customer states they did not make this purchase and do not recognize the charge. Our records indicate otherwise. The email address on the order matches the email registered to the customer's account. Following the purchase, the account was logged into 11 times over a period of 6 days, and every session came from the same IP address and device used to complete the purchase. This pattern shows consistent, ongoing use of the digital product by the same person who bought it, which is difficult to reconcile with an unauthorized transaction. It is possible the customer does not recognize our billing descriptor, so we can supply it along with the full login log and order confirmation on request. Based on this evidence, we ask that the dispute be resolved in our favor.

Sincerely,
Customer Support Team

### v1 (147 words)

I am writing in response to the dispute filed as Unauthorized purchase (fraud) on order ORD-1101 for $39.00, where the customer says they did not make this purchase and do not recognise the charge. Having reviewed our records, we believe the purchase was genuine, and I would like to walk you through what we found. The purchase email and account email are both alex.rivera@example.com, so the order and the account point to the same address. Afterwards, the records show 11 logins over 6 days from the purchase IP address and device, which looks like ordinary use by the person who bought it. The purchase IP address and cardholder are both in United States, so the location does not suggest someone else used the card. Taken together, these facts support that the buyer authorized this order. I respectfully ask that the dispute be resolved in the merchant's favor.

## d02 - fraud, $89.00, ground truth: customer should win

customer claim: I never bought this. Someone used my card and I want the charge reversed.

checklist decision: ACCEPT (rule fraud_email_and_country_differ_no_access)

- email_match [contradicts]: purchase email jordan.lec@example.com differs from account email jordan.lee@example.com
- access_after_purchase [missing]: no logins recorded on the account after the purchase
- country_match [contradicts]: purchase IP address is in Romania while the cardholder is in United States

### v0 (139 words)

To the Dispute Reviewer,

We have reviewed order ORD-1102 for $89.00 and do not intend to contest this dispute. Our records are consistent with the cardholder's claim of unauthorized use. The purchase IP address is in a different country than the cardholder's, the order came from a device never previously seen on the account, and the purchase email differs from the account email by a single letter. The account also shows no logins since the purchase, so the product does not appear to have been accessed by the account holder. We cannot show that the cardholder authorized this transaction, so we accept the reversal of the $89.00 charge. We have also revoked access to the product and flagged the account for additional verification to prevent further misuse. Please contact us if you need any further information.

Sincerely,
Merchant Support

### v1 (120 words)

Thank you for reviewing the dispute on order ORD-1102 for $89.00, filed as an unauthorized purchase (fraud). After checking our records, we are not contesting this dispute. The purchase was made with the email jordan.lec@example.com, which differs from the email on the account, jordan.lee@example.com. The purchase IP address is in Romania, while the cardholder is in United States. We also found no record of any logins on the account after the purchase, so nothing shows the account was used afterward. Because the evidence we have points toward the customer's claim rather than against it, we do not contest the dispute. We agree to refund the customer the full $89.00 for this order, and we hope this resolves the matter promptly.

## d03 - not_received, $24.00, ground truth: merchant should win

customer claim: I paid for a digital download and never received it.

checklist decision: DISPUTE (rule not_received_delivered_and_accessed)

- delivery_email [present]: delivery email to sam.patel@example.com was delivered at 2026-10-03T16:10Z
- access_logged [present]: 3 downloads logged within 10 minutes of purchase

### v0 (133 words)

Dear Dispute Reviewer,

I am writing in response to the dispute filed on order ORD-1103 for $24.00, in which the customer states the digital download was never received.

Our records show otherwise. The download link was emailed to the address provided at checkout at the time of purchase. Our system then logged three separate downloads of the file within ten minutes of the order being placed. This indicates the customer received the email and successfully accessed the product.

Because the product was delivered and used immediately after purchase, we believe the charge is valid and the dispute should be resolved in our favor. We can provide the delivery email record, the download logs with timestamps, and the order confirmation upon request.

Thank you for your time and review.

Sincerely,
The Merchant Support Team

### v1 (125 words)

I am writing about the dispute on order ORD-1103 for $24.00, filed with the reason "Item not received", where the customer says they paid for a digital download and never received it. I disagree with that claim, and our records tell a different story. A delivery email to sam.patel@example.com was delivered at 2026-10-03T16:10Z. There were also 3 downloads logged within 10 minutes of purchase. Taken together, this shows the product was sent to the customer and that downloads were recorded right after the order, which does not fit with never receiving it. I have kept this reply to what our records actually show and have not added anything beyond that. Based on this, I respectfully ask that the dispute be resolved in the merchant's favor.

## d04 - not_received, $59.00, ground truth: customer should win

customer claim: I paid for a software license and never got it. I can't use what I bought.

checklist decision: ACCEPT (rule not_received_bounced_no_access)

- delivery_email [contradicts]: delivery email to casey.nguyen@example.com bounced at 2026-10-05T09:30Z
- access_logged [missing]: no access or download events are logged for this order

### v0 (140 words)

Dear Dispute Reviewer,

Regarding order ORD-1104 for $59.00, we have reviewed our records and do not intend to contest this dispute. Our system shows that the delivery email containing the license key bounced, so it never reached the customer. There are also no access logs for this order, and the license key was never activated. This is consistent with the customer's statement that they did not receive the product and could not use it.

Because we did not successfully deliver what was purchased, we believe a refund of the full $59.00 is appropriate. We have deactivated the unused license key so it cannot be used after the refund. If the customer would still like the software, we would be glad to reissue it to a valid email address. We apologize for the inconvenience and appreciate your review.

Sincerely,
Customer Support

### v1 (133 words)

Thank you for reviewing this case and for your time. The dispute is filed under the reason "Item not received" for order reference ORD-1104, in the amount of $59.00. The customer says they paid for a software license, never received it, and cannot use what they bought. Our records show that the delivery email to casey.nguyen@example.com bounced at 2026-10-05T09:30Z. That means our delivery did not get through to the customer. We also found no logged access or download events for this order. Because of this, we do not contest this dispute, as we cannot show the customer received what they paid for. We apologize for the trouble this caused. We agree to refund the customer the full $59.00 for order ORD-1104, and we are glad to see this resolved in the customer's favor.

## d05 - not_as_described, $129.00, ground truth: merchant should win

customer claim: The course was not what the page described. It was missing content I paid for.

checklist decision: DISPUTE (rule not_as_described_matches_and_used)

- description_matches_delivery [present]: checkout page listed 6 modules and 6 modules were delivered
- usage_after_purchase [present]: the customer opened all 6 modules and completed 5
- mismatch_documented [missing]: no mismatch between the listing and the delivery is documented

### v0 (138 words)

Re: Dispute for order ORD-1105 ($129.00)

The customer claims the course did not match its description and was missing content. Our records show otherwise. The checkout page listed six modules, and the customer accessed all six after purchase. They also completed five of the six, which indicates the material was available and usable. The customer has not identified which content was supposedly missing, and nothing in our records shows a support request or complaint about missing material before this dispute was filed.

The product delivered matches what was advertised at checkout. We are happy to review any specifics the customer can provide, and we remain open to resolving this directly with them. Based on the evidence of full access and substantial completion, we respectfully ask that the dispute be decided in our favor.

Thank you for your review.

### v1 (135 words)

I am writing about the dispute on order ORD-1105 for $129.00, filed under the reason Not as described. I understand the customer says the course was not what the page described and that content they paid for was missing, and I would like to respond with what our records show. The checkout page listed 6 modules and 6 modules were delivered. The customer opened all 6 modules and completed 5. Given that, I cannot see how the course differed from what was advertised, and I have nothing in my records that shows otherwise. I have tried to keep this response limited to what I can verify, and I appreciate the time you are taking to review the case. Based on the facts above, I respectfully ask that this dispute be resolved in the merchant's favor.

## d06 - not_as_described, $49.00, ground truth: customer should win

customer claim: The product page said it works with version 5 and version 6. I only got version 5.

checklist decision: ACCEPT (rule not_as_described_documented_mismatch)

- description_matches_delivery [contradicts]: checkout page said works with v5 and v6 but v5 only was delivered
- usage_after_purchase [missing]: no usage is logged for this order
- mismatch_documented [contradicts]: 3 support emails confirm that only v5 was delivered

### v0 (127 words)

To the dispute reviewer,

Regarding order ORD-1106 for $49.00, we have reviewed our records and the customer's claim is accurate. Our product page stated that the product works with both version 5 and version 6, but only the version 5 files were delivered. Our support emails with the customer confirm that the version 6 files were missing and that we could not supply them. Because the product did not match what we advertised, we are not contesting this dispute. We ask that it be resolved in the customer's favor and the full $49.00 returned. We have also corrected the product page so the listing reflects what is actually delivered. We apologize to the customer for the error and appreciate the reviewer's time.

Sincerely,
The Merchant Support Team

### v1 (113 words)

We are responding to the Not as described dispute on order ORD-1106 for $49.00. After reviewing our records, we do not contest this dispute. Our records show that the checkout page said works with v5 and v6 but v5 only was delivered. Our support records also show that 3 support emails confirm that only v5 was delivered. Because what the customer was shown at checkout does not match what we delivered, and our own support correspondence backs up the customer's account, we have no basis to dispute the claim. This is a straightforward case of the product not matching its description. We agree to refund the customer the full $49.00 for order ORD-1106.

## d07 - subscription_canceled, $19.00, ground truth: merchant should win

customer claim: I canceled my subscription but I was still charged this month.

checklist decision: DISPUTE (rule subscription_policy_shown_cancel_after_charge)

- policy_shown [present]: cancellation policy shown at checkout: cancellation applies from the next billing cycle
- cancel_timing [present]: charge at 2026-10-12T14:03Z, cancel request at 2026-10-14T09:41Z, 2 days after the charge
- cancellation_confirmation [missing]: no cancellation confirmation exists

### v0 (143 words)

To the Dispute Reviewer,

I am writing about order ORD-1107 for $19.00. The customer states they canceled their subscription but were still charged this month. Our records show the charge was processed two days before the cancellation request was received, so the billing was valid when it occurred.

The cancellation policy was displayed at checkout, and it states that cancellations take effect from the next billing cycle. Because the request came after this month's charge, the customer's subscription correctly ended at the close of the current period, and no further charges will be made. The customer has retained access to the service through that period.

We can provide the checkout policy screenshot, the charge timestamp, and the cancellation request log on request. We believe this charge was properly authorized and respectfully ask that the dispute be resolved in our favor.

Sincerely,
The Merchant

### v1 (145 words)

Hello, I am writing about the dispute for order ORD-1107, for $19.00, filed under the reason "Subscription canceled." The customer says, "I canceled my subscription but I was still charged this month," and I have reviewed our records carefully. Before buying, the customer was shown our terms, which read: "cancellation policy shown at checkout: cancellation applies from the next billing cycle." Our records also show the timing of events: "charge at 2026-10-12T14:03Z, cancel request at 2026-10-14T09:41Z, 2 days after the charge." In other words, the cancel request came after the $19.00 charge had already been made, so under the policy the customer saw, the cancellation applied to the following billing cycle and not to this charge. For these reasons, I believe the charge was valid and consistent with the terms presented at checkout. I respectfully ask that this dispute be resolved in the merchant's favor.

## d08 - subscription_canceled, $19.00, ground truth: customer should win

customer claim: I canceled my subscription before the renewal date and was charged anyway.

checklist decision: ACCEPT (rule subscription_cancel_before_charge_confirmed)

- policy_shown [present]: cancellation policy shown at checkout: cancellation applies from the next billing cycle
- cancel_timing [contradicts]: cancel request at 2026-10-14T11:25Z, 6 days before the charge at 2026-10-20T08:00Z
- cancellation_confirmation [contradicts]: cancellation confirmation email sent at 2026-10-14T11:26Z

### v0 (128 words)

To the Dispute Reviewer,

Regarding order ORD-1108 for $19.00, we reviewed our records and found that the customer's claim is accurate. The customer canceled the subscription six days before the renewal date, and we sent a cancellation confirmation email at that time. The $19.00 charge should not have been processed after that cancellation, and we are not contesting this dispute.

We have refunded the full $19.00 to the original payment method, and the refund should appear within the standard processing window. We have also confirmed that the subscription is closed, so no further charges will occur. If it helps your review, we can provide the cancellation confirmation email and the refund confirmation. We apologize for the error and for the inconvenience to the customer.

Sincerely,
Merchant Support Team

### v1 (112 words)

Regarding the dispute over "Subscription canceled" on order ORD-1108 for $19.00, I have reviewed our records and we do not contest this dispute. Our checkout showed the customer this: "cancellation policy shown at checkout: cancellation applies from the next billing cycle". However, our records also show "cancel request at 2026-10-14T11:25Z, 6 days before the charge at 2026-10-20T08:00Z". We also sent "cancellation confirmation email sent at 2026-10-14T11:26Z". Because the cancellation request came in before the charge and was confirmed to the customer by email, the customer's claim that they canceled before the renewal date is supported, and we cannot show the charge was valid. We agree to refund the customer $19.00 in full.

## d09 - duplicate, $15.00, ground truth: merchant should win

customer claim: I was charged twice on the same day for the same thing.

checklist decision: DISPUTE (rule duplicate_distinct_ids_different_products)

- distinct_order_ids [present]: two charges on 2026-10-09 with distinct order ids ORD-1109 and ORD-1119
- different_products [present]: the orders are for two different products, Pixel Brush Pack and Icon Set Pro

### v0 (128 words)

Dear Dispute Reviewer,

We have reviewed the customer's claim that they were charged twice on the same day for the same item, in connection with order ORD-1109 for $15.00. Our records confirm that two charges were made on that day, but they are not duplicates. Each charge has its own distinct order ID and was for a different product. ORD-1109 covers the $15.00 purchase, and the other charge belongs to a separate order for a separate item. Because the customer purchased two different products, we do not believe a billing error occurred, and we have not refunded either charge. We can provide the order records and receipts for both transactions if that would help your review. Please let us know if you need anything further.

Sincerely,
Merchant Support

### v1 (124 words)

I am writing about the Duplicate charge dispute on order reference ORD-1109 for $15.00, where the customer says, "I was charged twice on the same day for the same thing." I have reviewed the records and I do not believe this was a duplicate. Our records show two charges on 2026-10-09 with distinct order ids ORD-1109 and ORD-1119, so each charge belongs to its own separate order. They also show the orders are for two different products, Pixel Brush Pack and Icon Set Pro, so the customer did not receive the same thing twice. Taken together, these facts point to two separate purchases rather than one purchase billed twice. For these reasons, I respectfully ask that the dispute be resolved in the merchant's favor.

## d10 - credit_not_processed, $79.00, ground truth: merchant should win

customer claim: I asked for a refund and it was never processed.

checklist decision: DISPUTE (rule credit_policy_shown_request_after_window)

- refund_policy_shown [present]: 14-day refund policy was shown at checkout
- request_vs_window [present]: refund requested on day 31 (2026-09-12), after the 14-day window and was declined
- refund_issued [missing]: no refund has been issued

### v0 (150 words)

Re: Dispute for order ORD-1110 ($79.00)

The customer states that a refund was requested and never processed. Our records show the request was received and answered, though not in the way the customer wanted. A 14-day refund policy was displayed at checkout, and the customer had to accept it before completing the purchase. The refund request was submitted on day 31, which is 17 days after the policy window closed. We declined it under the stated terms and notified the customer of that decision.

The product was delivered as described, and we have no record of a delivery failure or a technical problem reported within the refund period. Because the request fell outside the policy the customer agreed to, we believe the charge is valid. We can provide the checkout screenshot, the policy text, and the correspondence on request. We respectfully ask that the dispute be resolved in our favor.

### v1 (148 words)

I am writing about the dispute filed for "Refund not processed" on order ORD-1110, in the amount of $79.00. The customer says, "I asked for a refund and it was never processed," so I want to lay out what our records show. Before buying, the customer saw our terms, since the record states "14-day refund policy was shown at checkout." The request came too late, because the record states "refund requested on day 31 (2026-09-12), after the 14-day window and was declined." That is why no refund has been issued: the decision followed the policy shown to the customer before purchase, and it was not a case of the request being ignored. I have limited this reply to what I can verify, and it shows the customer knew the terms and asked outside the stated window. I respectfully ask that this dispute be resolved in the merchant's favor.
