-- Spec: Knowledge/29_Specs/002-registro-flow-unificado (data-model.md)
-- Aditivo: agrega razas (máx. 3, quiltro/doméstico excluyente — ya documentado en
-- Knowledge/01_Proyecto/DOC_MAESTRO_DOMINIO.md § 1 "Mascota" pero nunca implementado)
-- y tipo de pelo a public.pets. No modifica ni elimina ninguna columna existente.

alter table public.pets
  add column if not exists breeds text[] not null default '{}'::text[],
  add column if not exists coat_length text;
