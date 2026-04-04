"use client";

type PetSelectionDetail = {
  petId?: string;
  petName?: string;
};

type DeviceSelectionDetail = {
  deviceId?: string;
};

function canUseWindow() {
  return typeof window !== "undefined";
}

export function syncSelectedPet(petId: string | null, petName?: string | null) {
  if (!canUseWindow()) return;

  const currentPetId = window.localStorage.getItem("kittypau_pet_id");
  const currentPetName = window.localStorage.getItem("kittypau_pet_name");
  const nextPetId = petId ?? null;
  const nextPetName = petName ?? null;
  const idUnchanged = currentPetId === nextPetId;
  const nameUnchanged =
    nextPetName === null
      ? currentPetName === null
      : currentPetName === nextPetName;

  if (idUnchanged && nameUnchanged) return;

  if (petId) {
    window.localStorage.setItem("kittypau_pet_id", petId);
  } else {
    window.localStorage.removeItem("kittypau_pet_id");
  }

  if (petName !== undefined && petName !== null) {
    window.localStorage.setItem("kittypau_pet_name", petName);
  } else if (!petId) {
    window.localStorage.removeItem("kittypau_pet_name");
  }

  const detail: PetSelectionDetail = {};
  if (petId) detail.petId = petId;
  if (petName !== undefined && petName !== null) detail.petName = petName;

  window.dispatchEvent(new CustomEvent("kittypau-pet-change", { detail }));
}

export function syncSelectedDevice(deviceId: string | null) {
  if (!canUseWindow()) return;

  const currentDeviceId = window.localStorage.getItem("kittypau_device_id");
  const nextDeviceId = deviceId ?? null;
  if (currentDeviceId === nextDeviceId) return;

  if (deviceId) {
    window.localStorage.setItem("kittypau_device_id", deviceId);
  } else {
    window.localStorage.removeItem("kittypau_device_id");
  }

  const detail: DeviceSelectionDetail = {};
  if (deviceId) detail.deviceId = deviceId;

  window.dispatchEvent(new CustomEvent("kittypau-device-change", { detail }));
}
