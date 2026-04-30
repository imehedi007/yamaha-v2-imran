import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { generateCinematicImage, generatePersonaCopy } from '@/lib/server/gemini';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function POST(req: Request) {
  try {
    // We expect a multipart/form-data request
    const formData = await req.formData();
    const photo = formData.get('photo') as File;
    const persona = formData.get('persona') as string;
    const bikeId = parseInt(formData.get('bikeId') as string, 10);

    if (!photo || !persona || isNaN(bikeId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get('user_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: number;
    try {
      const secret = process.env.OTP_SECRET || 'fallback_secret_please_change';
      const verified = await jwtVerify(token, new TextEncoder().encode(secret));
      userId = verified.payload.userId as number;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Rate Limiting Check
    const settings = await query<any[]>('SELECT setting_key, setting_value FROM app_settings');
    const getSetting = (key: string, def: number) => {
      const s = settings.find(x => x.setting_key === key);
      return s ? parseInt(s.setting_value, 10) : def;
    };
    
    const maxDaily = getSetting('max_daily_generations', 10);
    const maxWeekly = getSetting('max_weekly_generations', 50);
    const maxMonthly = getSetting('max_monthly_generations', 100);

    const [dailyCountRes, weeklyCountRes, monthlyCountRes] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 DAY', [userId]),
      query<any[]>('SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 WEEK', [userId]),
      query<any[]>('SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 MONTH', [userId])
    ]);

    if (dailyCountRes[0].count >= maxDaily) {
      return NextResponse.json({ error: `You have reached the daily limit of ${maxDaily} images. Please try again tomorrow.` }, { status: 429 });
    }
    if (weeklyCountRes[0].count >= maxWeekly) {
      return NextResponse.json({ error: `You have reached the weekly limit of ${maxWeekly} images. Please try again next week.` }, { status: 429 });
    }
    if (monthlyCountRes[0].count >= maxMonthly) {
      return NextResponse.json({ error: `You have reached the monthly limit of ${maxMonthly} images. Please try again next month.` }, { status: 429 });
    }

    // Get bike details
    const bikes = await query<any[]>('SELECT model_name FROM bikes WHERE id = ?', [bikeId]);
    if (bikes.length === 0) {
      return NextResponse.json({ error: 'Invalid bike' }, { status: 400 });
    }
    const bikeModel = bikes[0].model_name;

    // Get active prompt template
    const prompts = await query<any[]>('SELECT prompt_template FROM prompts WHERE is_active = TRUE LIMIT 1');
    const promptTemplate = prompts.length > 0 ? prompts[0].prompt_template : 'Create a premium cinematic lifestyle portrait of the uploaded person with a {{bike_model}}. Scene: {{destination}}. Riding personality: {{persona}}.';

    // Convert photo to base64
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = photo.type;

    // Map persona (Behavior, Destination, Aspiration) to environment/destination
    const traits = persona.split(',');
    const behavior = traits[0];
    const userDestination = traits[1];
    const aspiration = traits[2];

    const destinationMap: Record<string, string> = {
      'Urban Nightscapes': 'Dhaka City neon nightscape, rainy streets, futuristic vibes',
      'Coastal Highways': 'Coxs Bazar Marine Drive, sunset beach background, palm trees',
      'Mountain Trails': 'Sajek Valley, misty mountains, winding roads, sunrise',
    };
    
    const environment = destinationMap[userDestination] || 'scenic landscape';

    // Generate Text Persona Copy
    const personaCopy = await generatePersonaCopy(persona, bikeModel);

    const poseDirection = "Full-body vertical portrait of the rider standing beside or lightly leaning on the motorcycle, one foot grounded, stylish confident body language, premium biker fashion pose, face clearly visible, head uncovered, no helmet on the head.";
    const cameraFrame = "Vertical 3:4 campaign framing, full head visible, full feet visible, entire rider visible from head to toe, bike fully visible, no cropped head, no cropped shoes, premium shallow depth of field.";
    const wardrobeDirection = "The rider is wearing premium biker streetwear: fitted jeans, a real leather jacket, clean boots or sneakers, and a cool modern Yamaha lifestyle look.";
    const realismDirection = "Ultra photorealistic commercial motorcycle photography. Real Yamaha design language, real motorcycle proportions, perfectly scaled human anatomy, real materials, realistic lighting, shadows, and reflections. No illustration, no cartoon, no caricature, no exaggerated features.";

    const finalPromptTemplate = `
      Create a premium, ultra-realistic lifestyle portrait of the EXACT specific individual shown in the attached reference images.
      
      SUBJECT IDENTITY (CRITICAL): YOU MUST 100% PRESERVE THE EXACT FACE, FACIAL HAIR, HAIRSTYLE, BONE STRUCTURE, AND AGE OF THE PERSON IN THE REFERENCE IMAGE. The face must be a flawless 1:1 match. Do not invent a new face or generalize the features.
      
      BODY & INTEGRATION: The rider has a realistic, perfectly proportioned adult human body. The exact face from the reference image is seamlessly integrated onto this body with matching skin tones and natural lighting.
      
      COMPOSITION: ${cameraFrame}
      
      POSE: ${poseDirection}
      
      WARDROBE: ${wardrobeDirection}
      
      ENVIRONMENT: ${environment}. 
      
      MOOD: ${behavior}, with a passion for ${aspiration}.
      
      VEHICLE: A highly detailed, realistic Yamaha ${bikeModel} motorcycle.
      
      REALISM: ${realismDirection}
    `;

    // Generate Image
    const generatedImageUrl = await generateCinematicImage(base64Image, mimeType, persona, bikeModel, environment, finalPromptTemplate);

    // Upload to AWS S3 instead of local public folder
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const crypto = await import('crypto');
    
    // Generate secure random hash for public URL
    const hashId = crypto.randomBytes(16).toString('hex');
    
    // Convert base64 data URI to buffer
    const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');
    
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const bucketName = process.env.S3_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME is not configured in .env.local');
    }

    const fileName = `generations/gen_${hashId}.jpg`;
    
    const s3Command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: imgBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read' // Make it publicly accessible
    });
    
    await s3Client.send(s3Command);
    const publicS3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;

    // Save to database
    await query<any>(
      'INSERT INTO generations (user_id, bike_id, generated_image_url, persona_title, traits_summary, hash_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, bikeId, publicS3Url, persona, personaCopy, hashId, 'completed']
    );

    // Clear the OTP session token so they must verify again to generate another image
    const cookieStoreForDelete = await cookies();
    cookieStoreForDelete.delete('user_token');

    return NextResponse.json({
      success: true,
      generationId: hashId,
      imageUrl: publicS3Url,
      personaCopy,
      status: 'completed'
    });

  } catch (error: any) {
    console.error('Generate API error:', error);
    
    // Provide granular error messages back to the user
    let errorMessage = 'Image generation failed. Please try again.';
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('503') || msg.includes('overloaded')) {
        errorMessage = 'AI servers are currently overloaded. Please try again in a few moments.';
      } else if (msg.includes('safety') || msg.includes('blocked') || msg.includes('policy')) {
        errorMessage = 'The generated image was blocked by AI safety filters. Please try a different photo.';
      } else if (msg.includes('payload') || msg.includes('no image')) {
        errorMessage = 'The AI model failed to construct the image. Please try a different photo or angle.';
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
