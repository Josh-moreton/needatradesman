-- Fix replica identity for verification_tokens table
-- This is required when using PostgreSQL with logical replication enabled
-- (common with managed PostgreSQL services)

ALTER TABLE "verification_tokens" REPLICA IDENTITY FULL;
