-- Step 1: Add new id column as BIGSERIAL
ALTER TABLE audit.logged_balance_actions 
ADD COLUMN id BIGSERIAL;

-- Step 2: Drop the old primary key constraint on audit_id
ALTER TABLE audit.logged_balance_actions 
DROP CONSTRAINT logged_balance_actions_pkey;

-- Step 3: Add new primary key constraint on the id column
ALTER TABLE audit.logged_balance_actions 
ADD CONSTRAINT logged_balance_actions_pkey PRIMARY KEY (id);

ALTER TABLE audit.logged_balance_actions 
DROP COLUMN audit_id;