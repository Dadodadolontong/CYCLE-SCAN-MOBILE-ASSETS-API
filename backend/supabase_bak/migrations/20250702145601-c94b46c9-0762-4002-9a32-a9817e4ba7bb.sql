-- Insert dummy data into locations
INSERT INTO public.locations (name, description, warehouse, zone) VALUES
('A-1-01', 'Aisle A, Section 1, Shelf 01', 'Warehouse A', 'Electronics Zone'),
('A-1-02', 'Aisle A, Section 1, Shelf 02', 'Warehouse A', 'Electronics Zone'),
('A-2-01', 'Aisle A, Section 2, Shelf 01', 'Warehouse A', 'Electronics Zone'),
('A-3-01', 'Aisle A, Section 3, Shelf 01', 'Warehouse A', 'Electronics Zone'),
('B-1-01', 'Aisle B, Section 1, Shelf 01', 'Warehouse B', 'Furniture Zone'),
('B-2-01', 'Aisle B, Section 2, Shelf 01', 'Warehouse B', 'Furniture Zone'),
('C-1-01', 'Aisle C, Section 1, Shelf 01', 'Warehouse C', 'General Storage'),
('C-2-01', 'Aisle C, Section 2, Shelf 01', 'Warehouse C', 'General Storage');

-- Insert dummy data into categories
INSERT INTO public.categories (name, description) VALUES
('Computer', 'Desktop computers, laptops, and related computing devices'),
('Electronics', 'Electronic devices including monitors, printers, phones'),
('Furniture', 'Office furniture including chairs, desks, tables'),
('Temporary', 'Temporary assets created during cycle counts'),
('Mobile Device', 'Smartphones, tablets, and mobile communication devices'),
('Office Equipment', 'Copiers, scanners, and general office equipment'),
('Storage', 'Storage devices, cabinets, and shelving units');

-- Create a dummy user for testing (this simulates a user that would be created through auth)
-- Note: In a real scenario, this would be handled by Supabase Auth
-- We'll insert a placeholder user role for demonstration
INSERT INTO public.user_roles (user_id, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin'),
('00000000-0000-0000-0000-000000000002', 'manager'),
('00000000-0000-0000-0000-000000000003', 'user');

-- Update existing assets to use proper location and category references
UPDATE public.assets SET 
  location = 'A-1-01',
  category = 'Computer'
WHERE erp_asset_id = 'ERP001';

UPDATE public.assets SET 
  location = 'B-2-01',
  category = 'Furniture'
WHERE erp_asset_id = 'ERP002';

UPDATE public.assets SET 
  location = 'A-3-01',
  category = 'Electronics'
WHERE erp_asset_id = 'ERP003';

UPDATE public.assets SET 
  location = 'C-1-01',
  category = 'Electronics'
WHERE erp_asset_id = 'ERP004';

UPDATE public.assets SET 
  location = 'B-1-01',
  category = 'Furniture'
WHERE erp_asset_id = 'ERP005';

UPDATE public.assets SET 
  location = 'A-2-01',
  category = 'Mobile Device'
WHERE erp_asset_id = 'ERP006';

UPDATE public.assets SET 
  location = 'C-2-01',
  category = 'Electronics'
WHERE erp_asset_id = 'ERP007';

-- Insert additional assets for more comprehensive testing
INSERT INTO public.assets (erp_asset_id, name, barcode, model, build, category, location, status) VALUES
('ERP008', 'Microsoft Surface Pro', '111222333', 'Surface Pro 9', 'SP9-2023', 'Computer', 'A-1-02', 'active'),
('ERP009', 'Standing Desk White', '444555666', 'ErgoDesk Pro', 'ED-2023', 'Furniture', 'B-1-01', 'active'),
('ERP010', 'Wireless Mouse', '777888999', 'Logitech MX Master', 'MX3S', 'Electronics', 'A-2-01', 'active'),
('ERP011', 'Ergonomic Keyboard', '101112131', 'Logitech Ergo K860', 'K860', 'Electronics', 'A-2-01', 'active'),
('ERP012', 'iPad Air', '141516171', 'iPad Air 5th Gen', 'A15-2022', 'Mobile Device', 'A-1-01', 'active'),
('ERP013', 'File Cabinet', '181920212', 'Steelcase 4-Drawer', 'SC-FC4', 'Storage', 'B-2-01', 'active'),
('ERP014', 'Webcam HD', '232425262', 'Logitech C920', 'C920s', 'Electronics', 'A-3-01', 'active'),
('ERP015', 'Headset Wireless', '272829303', 'Jabra Evolve2', 'E2-85', 'Electronics', 'A-3-01', 'active');

-- Insert dummy cycle count tasks
INSERT INTO public.cycle_count_tasks (name, description, location_filter, category_filter, status, created_by, assigned_to, started_at) VALUES
('Q1 2024 Electronics Count', 'Quarterly cycle count for all electronics in Warehouse A', 'A-%', 'Electronics', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', now() - interval '2 days'),
('Furniture Inventory Check', 'Monthly furniture inventory verification', 'B-%', 'Furniture', 'completed', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', now() - interval '1 week'),
('Computer Assets Audit', 'Semi-annual computer assets audit', '%', 'Computer', 'draft', '00000000-0000-0000-0000-000000000002', NULL, NULL);

-- Insert dummy cycle count items for the active task
WITH active_task AS (
  SELECT id FROM public.cycle_count_tasks WHERE status = 'active' LIMIT 1
),
electronics_assets AS (
  SELECT id, location FROM public.assets WHERE category = 'Electronics' AND location LIKE 'A-%'
)
INSERT INTO public.cycle_count_items (task_id, asset_id, expected_location, status, actual_location, counted_at, counted_by)
SELECT 
  (SELECT id FROM active_task),
  ea.id,
  ea.location,
  CASE 
    WHEN random() < 0.7 THEN 'counted'
    WHEN random() < 0.9 THEN 'pending'
    ELSE 'missing'
  END,
  CASE 
    WHEN random() < 0.8 THEN ea.location
    ELSE NULL
  END,
  CASE 
    WHEN random() < 0.7 THEN now() - interval '1 day'
    ELSE NULL
  END,
  CASE 
    WHEN random() < 0.7 THEN '00000000-0000-0000-0000-000000000002'
    ELSE NULL
  END
FROM electronics_assets ea;