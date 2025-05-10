import type { Latest, Platform } from "../types/latest";

function isValidPlatform(obj: Platform) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.signature === "string" &&
    typeof obj.url === "string"
  );
}

export function isValidLatest(obj: Latest) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.version === "string" &&
    typeof obj.notes === "string" &&
    typeof obj.pub_date === "string" &&
    typeof obj.platforms === "object" &&
    obj.platforms !== null &&
    Object.values(obj.platforms).every(isValidPlatform)
  );
}