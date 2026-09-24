-- Agrega la clave ERP al enum ModuleKey.
-- Idempotente: seguro de re-aplicar con `migrate deploy`.
-- Nota: va en su propia migración porque Postgres no permite USAR un valor
-- de enum recién agregado dentro de la misma transacción.
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'ERP';
