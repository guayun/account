import sql from '~/server/utils/database'

export async function logsCreate(open_id, client_key, type, description, address, ip, os) {
  const logs_create = await sql` INSERT INTO accounts.logs (open_id, client_key, type, description, address, ip, os) VALUES (${open_id}, ${client_key}, ${type}, ${description}, ${address}, ${ip}, ${os}) RETURNING id`
  if (!logs_create?.[0]?.id) return false
  return true
}