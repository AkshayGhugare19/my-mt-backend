-- This is an empty migration.
create schema audit;

-- Table to log balance actions
CREATE TABLE audit.logged_balance_actions (
    audit_id SERIAL PRIMARY KEY,
    user_id TEXT not null,
    column_name VARCHAR(50) NOT NULL,
    action VARCHAR(10) not null check (action in ('DEBIT', 'CREDIT')),
    difference numeric(65,30),
    old_value numeric(65,30),
    new_value numeric(65,30),
    changed_by VARCHAR(100) DEFAULT CURRENT_USER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revoke all permissions on the table from public
revoke all on audit.logged_balance_actions from public;

-- Grant select permission on the table to public
grant select on audit.logged_balance_actions to public;

-- Create indexes on the table for faster queries on the changed_at, action, and user_id columns
create index logged_balance_actions_changed_at_idx 
on audit.logged_balance_actions(changed_at);

create index logged_balance_actions_action_idx
on audit.logged_balance_actions(action);

create index logged_balance_actions_user_id_idx 
on audit.logged_balance_actions(user_id);

-- Function to track numeric changes in the balance column
CREATE OR REPLACE FUNCTION audit.track_numeric_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change
    INSERT INTO audit.logged_balance_actions (
          user_id,
          column_name,
          action,
          old_value,
          new_value,
          difference
      ) VALUES (
          NEW.user_id,
          'balance',
    CASE
      WHEN OLD.balance > NEW.balance THEN 'DEBIT'
      WHEN OLD.balance < NEW.balance THEN 'CREDIT'
    END,
          OLD.balance,
          NEW.balance,
          ABS(NEW.balance - OLD.balance)
      );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, audit;

-- Create the trigger on the target table
CREATE TRIGGER balance_change_trigger
    AFTER UPDATE ON public.balances
    FOR EACH ROW
    EXECUTE FUNCTION audit.track_numeric_changes();