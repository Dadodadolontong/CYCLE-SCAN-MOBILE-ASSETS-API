-- Seed data for local development
-- This file is run when resetting the local database

-- Insert sample locations for testing
INSERT INTO public.locations (name, description, erp_location_id) VALUES 
('Warehouse A', 'Main storage facility', 'WH001'),
('Office Building', 'Administrative offices', 'OF001'),
('Production Floor', 'Manufacturing area', 'PF001'),
('Shipping Dock', 'Loading and unloading area', 'SD001');

-- Insert sample categories for testing
INSERT INTO public.categories (name, description) VALUES 
('Computer Equipment', 'Laptops, desktops, servers'),
('Furniture', 'Desks, chairs, cabinets'),
('Machinery', 'Manufacturing equipment'),
('Vehicles', 'Company cars, trucks, forklifts');

-- Insert a test admin user role (replace with actual user ID when testing)
-- INSERT INTO public.user_roles (user_id, role) VALUES 
-- ('your-test-user-id-here', 'admin');

-- Insert sample assets for testing
INSERT INTO public.assets (name, erp_asset_id, location, category, barcode, model, build, status) VALUES 
('Dell Laptop #1', 'DELL001', (SELECT id FROM public.locations WHERE name = 'Office Building'), 'Computer Equipment', 'DL001', 'Dell Latitude 7420', '2023', 'active'),
('Office Chair #1', 'CHAIR001', (SELECT id FROM public.locations WHERE name = 'Office Building'), 'Furniture', 'CH001', 'Herman Miller Aeron', '2022', 'active'),
('Forklift #1', 'FORK001', (SELECT id FROM public.locations WHERE name = 'Warehouse A'), 'Vehicles', 'FK001', 'Toyota 8FGCU25', '2021', 'active');

-- Insert sample sync logs
INSERT INTO public.sync_logs (sync_type, status, records_processed, assets_synced) VALUES 
('manual', 'completed', 10, 8),
('scheduled', 'completed', 15, 12);