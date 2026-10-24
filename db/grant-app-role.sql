-- Run as the database owner AFTER creating a login role named axis_app in Neon.
-- Set that role's strong password using Neon Console; do not store the password in this file.
GRANT CONNECT ON DATABASE neondb TO axis_app;
GRANT USAGE ON SCHEMA public TO axis_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO axis_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO axis_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO axis_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO axis_app;
