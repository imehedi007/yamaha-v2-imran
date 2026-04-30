import { query } from '@/lib/server/mysql';
import { notFound } from 'next/navigation';
import styles from '../result.module.css';

import ResultActions from './ResultActions';

export default async function Result({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const hashId = resolvedParams.id;

  if (!hashId) {
    notFound();
  }

  const generations = await query<any[]>(`
    SELECT g.*, u.name, b.model_name 
    FROM generations g
    JOIN users u ON g.user_id = u.id
    JOIN bikes b ON g.bike_id = b.id
    WHERE g.hash_id = ?
  `, [hashId]);

  if (generations.length === 0) {
    notFound();
  }

  const data = generations[0];

  return (
    <main className="page-container">
      <div className={`${styles.container} fade-in`}>
        <div className={styles.card} id="persona-card">
          <div className={styles.imageWrapper}>
            <img src={data.generated_image_url} alt="AI Persona" className={styles.genImage} />

          </div>
          <div className={styles.content}>
            <div className={styles.badge}>{data.model_name} Rider</div>
            <h2 className={styles.personaTitle}>{data.name}'s Persona</h2>
            <p className={styles.copy}>{data.traits_summary}</p>
          </div>
        </div>

        <ResultActions imageUrl={data.generated_image_url} userName={data.name} />
      </div>
    </main>
  );
}
