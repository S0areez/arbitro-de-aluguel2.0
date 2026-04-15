-- Add new match_status values for the full workflow
ALTER TYPE match_status ADD VALUE 'waiting_payment';
ALTER TYPE match_status ADD VALUE 'confirmed';
ALTER TYPE match_status ADD VALUE 'ready';
ALTER TYPE match_status ADD VALUE 'in_progress';
ALTER TYPE match_status ADD VALUE 'completed';