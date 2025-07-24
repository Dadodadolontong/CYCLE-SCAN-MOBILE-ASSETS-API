-- Insert dummy data into assets table
INSERT INTO public.assets (erp_asset_id, name, barcode, model, build, category, location, status, last_seen) VALUES
('ERP001', 'Dell Laptop', '123456789', 'Latitude 5520', '2023', 'Computer', 'Warehouse A-1', 'active', NULL),
('ERP002', 'Office Chair', '987654321', 'Herman Miller Aeron', 'Chair-2022', 'Furniture', 'Warehouse B-2', 'active', '2024-01-15T10:30:00Z'),
('ERP003', 'Printer HP', '456789123', 'LaserJet Pro', 'M404dn', 'Electronics', 'Warehouse A-3', 'active', NULL),
('ERP004', 'Monitor Samsung', '789123456', '27" 4K', 'U28E590D', 'Electronics', 'Warehouse C-1', 'active', NULL),
('ERP005', 'Desk Table', '321654987', 'Standing Desk', 'SD-2023', 'Furniture', 'Warehouse B-1', 'active', '2024-01-14T14:20:00Z'),
('ERP006', 'Smartphone iPhone', '159753486', 'iPhone 14', 'A2649', 'Electronics', 'Warehouse A-2', 'active', NULL),
('ERP007', 'Projector Epson', '753951842', 'PowerLite', 'S41+', 'Electronics', 'Warehouse C-2', 'active', NULL);