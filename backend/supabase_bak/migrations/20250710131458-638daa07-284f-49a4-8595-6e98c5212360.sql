-- First migration: Add unique constraint and expand enum
ALTER TABLE public.user_roles ADD CONSTRAINT unique_user_roles_user_id UNIQUE (user_id);

-- Expand app_role enum to include new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accounting_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controller';