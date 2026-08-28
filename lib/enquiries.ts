import { sql } from "@/lib/db";

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
}

// Row shape matches Enquiry exactly (all TEXT columns — see the CREATE TABLE this was set up
// with) so no mapping is needed between what Postgres returns and what the rest of the app
// already expects from the old JSON-file version of this module.
export async function getEnquiries(): Promise<Enquiry[]> {
  const rows = await sql`SELECT id, name, email, message, timestamp FROM enquiries ORDER BY timestamp ASC`;
  return rows as Enquiry[];
}

export async function saveEnquiry(enquiry: Enquiry): Promise<void> {
  await sql`
    INSERT INTO enquiries (id, name, email, message, timestamp)
    VALUES (${enquiry.id}, ${enquiry.name}, ${enquiry.email}, ${enquiry.message}, ${enquiry.timestamp})
  `;
}

export async function deleteEnquiry(id: string): Promise<void> {
  await sql`DELETE FROM enquiries WHERE id = ${id}`;
}

export async function clearEnquiries(): Promise<void> {
  await sql`DELETE FROM enquiries`;
}
