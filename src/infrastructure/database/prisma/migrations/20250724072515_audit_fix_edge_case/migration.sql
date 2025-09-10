-- This is an empty migration.

-- Function to track numeric changes in the balance column
CREATE OR REPLACE FUNCTION audit.track_numeric_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance = OLD.balance THEN
        RETURN NEW;
    END IF;
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