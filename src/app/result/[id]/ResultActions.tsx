'use client';

import { useState } from 'react';
import styles from '../result.module.css';

interface ResultActionsProps {
  imageUrl: string;
  userName: string;
}

export default function ResultActions({ imageUrl, userName }: ResultActionsProps) {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'shared'>('idle');

  const handleDownload = () => {
    if (downloadState !== 'idle') return;
    setDownloadState('downloading');
    
    // Use the backend proxy to download cross-origin images from S3
    setTimeout(() => {
      const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`;
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.download = `Yamaha_Persona_${userName.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 3000);
    }, 800);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Yamaha Ride Persona',
          text: `Check out my Yamaha cinematic persona! Generated with AI.`,
          url: window.location.href,
        });
        setShareState('shared');
        setTimeout(() => setShareState('idle'), 3000);
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      // Fallback: Copy link
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareState('shared');
        setTimeout(() => setShareState('idle'), 3000);
      } catch (err) {
        alert('Could not share or copy link.');
      }
    }
  };

  return (
    <div className={styles.actionsGrid}>
      <button 
        className={`${styles.actionBtn} ${styles.primaryBtn}`} 
        onClick={handleShare}
      >
        {shareState === 'shared' ? (
          <>
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Link Copied!
          </>
        ) : (
          <>
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Share Persona
          </>
        )}
      </button>

      <div className={styles.rowActions}>
        <button 
          className={styles.actionBtn} 
          onClick={handleDownload}
          disabled={downloadState === 'downloading'}
        >
          {downloadState === 'idle' && (
            <>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download
            </>
          )}
          {downloadState === 'downloading' && (
            <>
              <div className={styles.spinnerSmall}></div>
              Saving...
            </>
          )}
          {downloadState === 'done' && (
            <>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Saved!
            </>
          )}
        </button>

        <button 
          className={styles.actionBtn} 
          onClick={() => window.location.href = '/'}
        >
          <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Home
        </button>
      </div>
    </div>
  );
}
