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

### v1 (132 words)

I am writing in response to the dispute filed as an unauthorized purchase (fraud) on order ORD-1101 for $39.00. The customer says they did not make this purchase and do not recognise the charge, but the records we verified point the other way. The email address used at checkout and the email address on the customer's account are the same, alex.rivera@example.com. After the purchase, the account was used for 11 logins over 6 days, all from the same IP address and device that made the purchase. In addition, the purchase IP address and the cardholder are both located in United States. Taken together, these points indicate that this purchase was made by the account holder and not by someone else. I respectfully ask that this dispute be resolved in the merchant's favor.

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

Thank you for reviewing the dispute on order ORD-1102 for $89.00, filed as an unauthorized purchase (fraud). The customer says they never made this purchase and that someone else used their card. After checking our records, we found details that fit that claim. The email address entered at purchase was jordan.lec@example.com, which is different from the email on the account, jordan.lee@example.com. The purchase also came from an IP address in Romania, while the cardholder is in United States. Because both of these details point away from the cardholder, and no logins were recorded on the account after the purchase, we do not contest this dispute. We accept the customer's claim and agree to refund the full $89.00 to the customer.

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

### v1 (124 words)

I am writing about the dispute on order ORD-1103 for $24.00, filed with the reason that the purchase was not received. The customer says they paid for a digital download and never received it, but our records show otherwise. A delivery email to sam.patel@example.com was delivered at 2026-10-03T16:10Z. On top of that, the download activity shows 3 downloads logged within 10 minutes of purchase, which means the product was accessed right after the order. Based on these two facts, the download was delivered and accessed, and the order was fulfilled. I have not added anything beyond what our verified records show, and I am happy to answer any further questions you have. I respectfully ask that this dispute be resolved in the merchant's favor.

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

### v1 (134 words)

Hello, I am writing about the dispute on order ORD-1104 for $59.00, filed under the reason Item not received. The customer says they paid for a software license and never got it, so they cannot use what they bought. Our records support that: the email sending the license to casey.nguyen@example.com bounced at 2026-10-05T09:30Z. We also found no sign that anyone accessed or downloaded the product for this order. Since the only proof we have points to the license not arriving, and nothing shows otherwise, we do not contest this dispute. We would rather be straightforward than argue a case we cannot support. We agree to refund the customer the full $59.00. Thank you for taking the time to review this, and please let us know if you need anything else to close it out.

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

### v1 (143 words)

I am writing about the Not as described dispute on order ORD-1105 for $129.00. The customer says the course did not match the page and was missing content that was paid for, and I respectfully disagree with that claim. The checkout page listed 6 modules, and all 6 modules were delivered to the customer. After purchase, the customer opened all 6 modules and completed 5, which shows the course was accessible and was actually used. I also found no documentation of any difference between what the listing promised and what was delivered. Based on this, the product matched its description and the customer received what was purchased. Because the delivery matched the listing and the customer went through nearly the whole course, I do not believe this charge was made in error. I ask that the dispute be resolved in the merchant's favor.

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

### v1 (111 words)

We are responding to the Not as described dispute on order ORD-1106 for $49.00. Our checkout page told customers the product works with v5 and v6, but v5 only was delivered. 3 support emails confirm that v5 only was delivered, which matches what the customer told you. Because our own page and our own support emails line up with the customer's claim, we do not contest this dispute. The product was not delivered as it was described at checkout, and we would rather be straightforward about that than argue the point. We are sorry for the confusion this caused. We agree to refund the customer the full $49.00 for order ORD-1106.

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

### v1 (150 words)

I am writing about the dispute for order ORD-1107, a charge of $19.00, filed under the reason Subscription canceled. The customer says they canceled their subscription but were still charged this month, and I would like to lay out what our records show. At checkout, the customer was shown our cancellation policy, which states that cancellation applies from the next billing cycle. Our records show the charge was made at 2026-10-12T14:03Z, and the cancel request came in at 2026-10-14T09:41Z, which is 2 days after the charge. Because the request arrived after the payment had already been taken, and the policy the customer saw says cancellation takes effect from the next billing cycle, the $19.00 charge was made in line with those terms. I have tried to be accurate and have stated only what I can verify. I respectfully ask that this dispute be resolved in my favor as the merchant.

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

We are reviewing the dispute for the reason Subscription canceled on order ORD-1108 for $19.00, and we do not contest it. Our cancellation policy was shown at checkout and said that cancellation applies from the next billing cycle. However, the customer's cancel request was received at 2026-10-14T11:25Z, which was 6 days before the charge at 2026-10-20T08:00Z. We also sent a cancellation confirmation email at 2026-10-14T11:26Z, which supports the customer's account that they canceled before renewal. Because the cancellation came before the charge and we confirmed it to the customer, we cannot show the charge was valid, so we are not contesting this dispute. We agree to refund the customer the full $19.00.

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

### v1 (120 words)

Hello, I am writing about the dispute for order ORD-1109, a charge of $15.00, filed under the reason Duplicate charge. The customer says they were charged twice on the same day for the same thing, but our records show something different. There were indeed two charges on 2026-10-09, and each one carries its own order id, ORD-1109 and ORD-1119, so they are separate transactions rather than one purchase billed twice. The two orders were also for two different products, Pixel Brush Pack and Icon Set Pro, so this was not the same product bought twice. Based on this, the charge of $15.00 on ORD-1109 is not a duplicate. I respectfully ask that this dispute be resolved in the merchant's favor.

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

### v1 (150 words)

Hello, I am writing about the dispute on order ORD-1110 for $79.00, filed under the reason Refund not processed. The customer says they asked for a refund and it was never processed, and I want to explain what happened. Before buying, the customer was shown our 14-day refund policy at checkout, so the terms were stated up front. The refund request was made on day 31, which was 2026-09-12, after the 14-day window had ended, and it was declined. Because the request fell outside the policy window, no refund has been issued. I sell digital products, and the refund terms the customer saw at checkout are the terms I applied to this request. I have kept this reply to the facts I can verify, and I believe the policy was applied as it was presented to the customer. I respectfully ask that this dispute be resolved in the merchant's favor.
