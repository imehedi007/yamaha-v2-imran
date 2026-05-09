import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  await verifyAuth(token);
}

export async function GET(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');
    
    const options = await query<any[]>('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY id ASC', [questionId]);
    
    // For each option, fetch its bike mappings if any
    for (let opt of options) {
      const mappings = await query<any[]>(`
        SELECT m.bike_id, b.model_name 
        FROM option_bike_mappings m 
        JOIN bikes b ON m.bike_id = b.id 
        WHERE m.option_id = ?
      `, [opt.id]);
      opt.bike_mappings = mappings;
    }

    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await checkAdmin();
    const { question_id, option_text, option_desc, icon_name, metadata, bike_ids } = await req.json();
    
    const result = await query<any>('INSERT INTO quiz_options (question_id, option_text, option_desc, icon_name, metadata) VALUES (?, ?, ?, ?, ?)', 
      [question_id, option_text, option_desc, icon_name, JSON.stringify(metadata || {})]);
    
    const optionId = result.insertId;

    if (bike_ids && Array.isArray(bike_ids)) {
      for (const bikeId of bike_ids) {
        await query('INSERT INTO option_bike_mappings (option_id, bike_id) VALUES (?, ?)', [optionId, bikeId]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error adding option' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdmin();
    const { id, option_text, option_desc, icon_name, metadata, bike_ids } = await req.json();
    
    await query('UPDATE quiz_options SET option_text = ?, option_desc = ?, icon_name = ?, metadata = ? WHERE id = ?', 
      [option_text, option_desc, icon_name, JSON.stringify(metadata || {}), id]);
    
    // Update bike mappings: remove old and add new
    if (bike_ids && Array.isArray(bike_ids)) {
      await query('DELETE FROM option_bike_mappings WHERE option_id = ?', [id]);
      for (const bikeId of bike_ids) {
        await query('INSERT INTO option_bike_mappings (option_id, bike_id) VALUES (?, ?)', [id, bikeId]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating option' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await query('DELETE FROM quiz_options WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting option' }, { status: 500 });
  }
}
