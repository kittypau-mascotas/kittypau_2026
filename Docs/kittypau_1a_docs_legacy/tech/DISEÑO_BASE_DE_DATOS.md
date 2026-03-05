# Diseño de la Base de Datos v2.2

**Autor:** Gemini (con feedback de Mauro)
**Fecha:** 2025-10-09

## 1. Introducción

Esta versión del esquema (v2.2) expande la arquitectura v2.1 para dar soporte a la **"Ficha Integral de la Mascota"**. Se añaden numerosos campos a las tablas `pets` y `households` y se crean nuevas tablas para el historial de salud, permitiendo una recolección de datos rica y estructurada.

---

## 2. Definición del Esquema (Drizzle ORM) v2.2

Este es el código propuesto para `shared/schema.ts`.

```typescript
import { pgTable, text, serial, integer, timestamp, date, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['owner', 'carer']);
export const deviceModeEnum = pgEnum('device_mode', ['comedero', 'bebedero', 'collar', 'cama_inteligente']);
export const housingTypeEnum = pgEnum('housing_type', ['casa', 'departamento', 'campo', 'otro']);
export const exteriorAccessEnum = pgEnum('exterior_access', ['si', 'no', 'supervisado']);
export const noiseLevelEnum = pgEnum('noise_level', ['ruidoso', 'tranquilo', 'mixto']);
export const petSexEnum = pgEnum('pet_sex', ['macho', 'hembra']);
export const petEnergyLevelEnum = pgEnum('pet_energy', ['alta', 'media', 'baja']);
export const petTemperamentEnum = pgEnum('pet_temperament', ['sociable', 'timido', 'territorial', 'curioso', 'otro']);
export const petOriginEnum = pgEnum('pet_origin', ['adopcion', 'compra', 'nacimiento', 'calle', 'otro']);

// --- TABLAS PRINCIPALES ---

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  housingType: housingTypeEnum("housing_type"),
  hasExteriorAccess: exteriorAccessEnum("has_exterior_access"),
  peopleInHome: integer("people_in_home"),
  hasChildren: boolean("has_children"),
  noiseLevel: noiseLevelEnum("noise_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default('carer'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  species: text("species"),
  breed: text("breed"),
  sex: petSexEnum("sex"),
  birthDate: date("birth_date"),
  color: text("color"),
  distinguishingFeatures: text("distinguishing_features"),
  avatarUrl: text("avatar_url"),
  energyLevel: petEnergyLevelEnum("energy_level"),
  temperament: petTemperamentEnum("temperament"),
  origin: petOriginEnum("origin"),
  acquisitionDate: date("acquisition_date"),
  isSterilized: boolean("is_sterilized"),
  lastVetVisit: date("last_vet_visit"),
  currentWeight: real("current_weight"),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  mode: deviceModeEnum("mode").notNull(),
});

// --- TABLAS DE UNIÓN Y DE HISTORIAL ---

export const petsToDevices = pgTable("pets_to_devices", {
    petId: integer("pet_id").notNull().references(() => pets.id, { onDelete: 'cascade' }),
    deviceId: integer("device_id").notNull().references(() => devices.id, { onDelete: 'cascade' }),
});

export const petVaccinations = pgTable("pet_vaccinations", {
    id: serial("id").primaryKey(),
    petId: integer("pet_id").notNull().references(() => pets.id, { onDelete: 'cascade' }),
    vaccineName: text("vaccine_name").notNull(),
    dateAdministered: date("date_administered").notNull(),
});

export const petHealthConditions = pgTable("pet_health_conditions", {
    id: serial("id").primaryKey(),
    petId: integer("pet_id").notNull().references(() => pets.id, { onDelete: 'cascade' }),
    conditionName: text("condition_name").notNull(),
    notes: text("notes"),
    startDate: date("start_date"),
});

export const consumptionEvents = pgTable("consumption_events", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id, { onDelete: 'cascade' }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  amountGrams: real("amount_grams").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
});

// --- DEFINICIÓN DE RELACIONES ---

export const householdsRelations = relations(households, ({ many }) => ({
  users: many(users),
  pets: many(pets),
  devices: many(devices),
}));

export const usersRelations = relations(users, ({ one }) => ({
  household: one(households, { fields: [users.householdId], references: [households.id] }),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  household: one(households, { fields: [pets.householdId], references: [households.id] }),
  petsToDevices: many(petsToDevices),
  vaccinations: many(petVaccinations),
  healthConditions: many(petHealthConditions),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  household: one(households, { fields: [devices.householdId], references: [households.id] }),
  consumptionEvents: many(consumptionEvents),
  petsToDevices: many(petsToDevices),
}));

export const petsToDevicesRelations = relations(petsToDevices, ({ one }) => ({
  pet: one(pets, { fields: [petsToDevices.petId], references: [pets.id] }),
  device: one(devices, { fields: [petsToDevices.deviceId], references: [devices.id] }),
}));

export const petVaccinationsRelations = relations(petVaccinations, ({ one }) => ({
  pet: one(pets, { fields: [petVaccinations.petId], references: [pets.id] }),
}));

export const petHealthConditionsRelations = relations(petHealthConditions, ({ one }) => ({
  pet: one(pets, { fields: [petHealthConditions.petId], references: [pets.id] }),
}));

export const consumptionEventsRelations = relations(consumptionEvents, ({ one }) => ({
  device: one(devices, { fields: [consumptionEvents.deviceId], references: [devices.id] }),
}));
```
