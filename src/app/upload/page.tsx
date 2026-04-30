'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './upload.module.css';

const LOADING_MESSAGES = [
  "Analyzing facial features...",
  "Mapping your ride personality...",
  "Matching with Yamaha R15M...",
  "Crafting cinematic landscape...",
  "Blending persona with environment...",
  "Finalizing your cinematic portrait..."
];

export default function Upload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quizData, setQuizData] = useState<any>(null);

  useEffect(() => {
    if (localStorage.getItem('isAuthenticated') !== 'true') {
      router.push('/');
      return;
    }

    const data = sessionStorage.getItem('quizResult');
    if (data) {
      setQuizData(JSON.parse(data));
    } else {
      router.push('/quiz');
    }
  }, [router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    if (loading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1080;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.9);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 6 * 1024 * 1024) {
        setError('File size must be less than 6MB');
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError('');
    }
  };

  const handleGenerate = async () => {
    if (!file || !quizData) return;
    
    setLoading(true);
    setError('');

    try {
      const resizedBlob = await resizeImage(file);
      const formData = new FormData();
      formData.append('photo', resizedBlob, 'upload.jpg');
      formData.append('persona', quizData.persona);
      formData.append('bikeId', quizData.bikeId);

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('quizState');
        sessionStorage.removeItem('quizResult');
        router.push(`/result/${data.generationId}`);
      } else {
        setError(data.error || 'Generation failed');
        setLoading(false);
      }
    } catch (err) {
      setError('Error during generation. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className={styles.loadingContainer}>
          <div className={styles.skeleton}></div>
          <div className={styles.loadingMessage}>
            <p className={styles.fadeText}>{LOADING_MESSAGES[loadingStep]}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className={`${styles.container} fade-in`}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', fontFamily: 'Outfit' }}>Upload Your Portrait</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          For the best cinematic match, upload a clear front-facing photo.
        </p>

        {error && <div style={{ color: '#ff4d4d', marginBottom: '16px', fontSize: '13px', background: 'rgba(255,77,77,0.1)', padding: '8px', borderRadius: '4px' }}>{error}</div>}

        <div 
          className={styles.uploadBox} 
          onClick={() => fileInputRef.current?.click()}
          style={{ borderColor: preview ? 'transparent' : 'rgba(255,255,255,0.2)' }}
        >
          {preview ? (
            <img src={preview} alt="Preview" className={styles.preview} />
          ) : (
            <div className={styles.uploadText}>
              <span className={styles.icon}>👤</span>
              <h3 style={{ fontSize: '18px', fontWeight: '500' }}>Tap to select photo</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Max 6MB (JPG, PNG)</p>
            </div>
          )}
          {preview && (
            <div className={styles.uploadText} style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
              <p style={{ fontSize: '14px' }}>Tap to change</p>
            </div>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />

        <button 
          className="primary-button" 
          disabled={!file}
          onClick={handleGenerate}
          style={{ marginTop: '16px' }}
        >
          Generate My Persona
        </button>
      </div>
    </main>
  );
}
