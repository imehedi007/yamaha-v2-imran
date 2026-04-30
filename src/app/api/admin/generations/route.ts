import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  await verifyAuth(token);
}

export async function GET() {
  try {
    await checkAdmin();

    const generations = await query<any[]>(`
      SELECT 
        g.id,
        g.hash_id,
        g.generated_image_url,
        g.persona_title,
        g.created_at,
        u.id as user_id,
        u.name as user_name,
        u.phone as user_phone,
        b.model_name as bike_model
      FROM generations g
      JOIN users u ON g.user_id = u.id
      JOIN bikes b ON g.bike_id = b.id
      ORDER BY g.created_at DESC
    `);

    return NextResponse.json({ generations });
  } catch (error) {
    console.error('Admin generations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
