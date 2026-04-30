import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { z } from 'zod';

const quizSchema = z.object({
  traits: z.array(z.string()).min(1)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = quizSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid traits array' }, { status: 400 });
    }

    const { traits } = result.data;
    
    // Join traits in order to maintain Behavior, Destination, Aspiration hierarchy
    const traitCombination = traits.join(',');

    // Find rule matching trait_combination
    // Rules in DB should follow "Behavior,Destination,Aspiration"
    let rules = await query<any[]>(
      `SELECT r.assigned_bike_id, b.model_name, b.type, b.description, b.image_url 
       FROM rules r 
       JOIN bikes b ON r.assigned_bike_id = b.id
       WHERE r.trait_combination = ? LIMIT 1`,
      [traitCombination]
    );

    // If no exact match, try matching just the first two (Behavior, Destination)
    if (rules.length === 0) {
      const partialCombination = traits.slice(0, 2).join(',') + '%';
      rules = await query<any[]>(
        `SELECT r.assigned_bike_id, b.model_name, b.type, b.description, b.image_url 
         FROM rules r 
         JOIN bikes b ON r.assigned_bike_id = b.id
         WHERE r.trait_combination LIKE ? LIMIT 1`,
        [partialCombination]
      );
    }

    let assignedBike;

    if (rules.length > 0) {
      assignedBike = rules[0];
    } else {
      // Fallback: pick a default bike (e.g. R15)
      const fallbackBikes = await query<any[]>('SELECT id as assigned_bike_id, model_name, type, description, image_url FROM bikes WHERE model_name LIKE "%R15%" LIMIT 1');
      if (fallbackBikes.length > 0) {
        assignedBike = fallbackBikes[0];
      } else {
        const anyBike = await query<any[]>('SELECT id as assigned_bike_id, model_name, type, description, image_url FROM bikes LIMIT 1');
        assignedBike = anyBike[0];
      }
    }

    return NextResponse.json({
      success: true,
      persona: traitCombination,
      bike: assignedBike
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
