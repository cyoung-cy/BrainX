ALTER TABLE commerce_subscriptions
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);

UPDATE commerce_subscriptions
SET billing_cycle = 'MONTHLY'
WHERE billing_cycle IS NULL;

ALTER TABLE commerce_subscriptions
ALTER COLUMN billing_cycle SET DEFAULT 'MONTHLY';

ALTER TABLE commerce_subscriptions
ALTER COLUMN billing_cycle SET NOT NULL;

ALTER TABLE commerce_checkout_sessions
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);

UPDATE commerce_checkout_sessions
SET billing_cycle = 'MONTHLY'
WHERE billing_cycle IS NULL;

ALTER TABLE commerce_checkout_sessions
ALTER COLUMN billing_cycle SET DEFAULT 'MONTHLY';

ALTER TABLE commerce_checkout_sessions
ALTER COLUMN billing_cycle SET NOT NULL;

ALTER TABLE commerce_checkout_sessions
DROP CONSTRAINT IF EXISTS commerce_checkout_sessions_status_check;

ALTER TABLE commerce_checkout_sessions
ADD CONSTRAINT commerce_checkout_sessions_status_check
CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED'));
