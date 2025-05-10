import WireKVS from "wirekvs-js";

export const db = WireKVS.connect(
  process.env.DATABASE_ID!,
  process.env.DATABASE_TOKEN!
);
