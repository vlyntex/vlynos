'use server';

import { Client } from 'pg';
import { cookies } from 'next/headers';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Koushik%401618@localhost:5432/vlyntech_dev?schema=public";

function getClient() {
  return new Client({ connectionString: DATABASE_URL });
}

export async function deleteVendorAction(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) throw new Error("Unauthorized");
  
  const client = getClient();
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM "User" WHERE "vendorId" = $1', [id]);
    await client.query('DELETE FROM "Vendor" WHERE id = $1', [id]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

export async function deleteDeveloperAction(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) throw new Error("Unauthorized");
  
  const client = getClient();
  await client.connect();
  
  try {
    await client.query('DELETE FROM "User" WHERE id = $1', [id]);
  } finally {
    await client.end();
  }
}

export async function deleteChatAction(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) throw new Error("Unauthorized");
  
  const client = getClient();
  await client.connect();
  
  try {
    // Delete the chat; cascade should handle members and messages, but we use raw queries so we delete them manually if not cascaded.
    await client.query('BEGIN');
    await client.query('DELETE FROM "Message" WHERE "chatId" = $1', [id]);
    await client.query('DELETE FROM "ChatMember" WHERE "chatId" = $1', [id]);
    await client.query('DELETE FROM "Chat" WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
