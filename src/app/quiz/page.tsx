'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './quiz.module.css';

const QUESTIONS = [
  {
    id: 'riding_behavior',
    title: 'How would you describe your riding behavior?',
    options: [
      { id: 'Weekend Explorer', title: 'Weekend Explorer', desc: 'Long journeys discovering new horizons.' },
      { id: 'Daily Commuter', title: 'Daily Commuter', desc: 'Navigating the city with efficiency and style.' },
      { id: 'Speed Enthusiast', title: 'Speed Enthusiast', desc: 'Thrilling performance and high-speed control.' },
    ]
  },
  {
    id: 'destination',
    title: 'Choose your favorite riding destination',
    options: [
      { id: 'Urban Nightscapes', title: 'Urban Nightscapes', desc: 'Neon lights and city vibes.' },
      { id: 'Coastal Highways', title: 'Coastal Highways', desc: 'Salty breeze and endless horizons.' },
      { id: 'Mountain Trails', title: 'Mountain Trails', desc: 'Rugged terrain and breathtaking peaks.' },
    ]
  },
  {
    id: 'aspiration',
    title: 'What is your ultimate riding aspiration?',
    options: [
      { id: 'Iconic Blue', title: 'Racing Blue', desc: 'The signature Yamaha racing spirit.' },
      { id: 'Dark Side', title: 'Dark Side of Japan', desc: 'Aggressive styling and urban edge.' },
      { id: 'Dream Bike', title: 'Dream Bike', desc: 'Uncompromising power and ultimate prestige.' },
    ]
  }
];

export default function Quiz() {
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Authentication check & Load state from sessionStorage on mount
  useEffect(() => {
    // If not authenticated, kick back to OTP page
    if (localStorage.getItem('isAuthenticated') !== 'true') {
      router.push('/');
      return;
    }

    const savedState = sessionStorage.getItem('quizState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setCurrentQ(parsed.currentQ || 0);
        setAnswers(parsed.answers || []);
        setSelectedOption(parsed.selectedOption || null);
      } catch (e) {}
    }
    setIsInitialized(true);
  }, [router]);

  // Save state to sessionStorage on every change
  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem('quizState', JSON.stringify({ currentQ, answers, selectedOption }));
    }
  }, [currentQ, answers, selectedOption, isInitialized]);

  // Prevent accidental reload during loading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading]);

  const handleNext = async () => {
    if (!selectedOption) return;

    const newAnswers = [...answers];
    newAnswers[currentQ] = selectedOption;
    
    if (currentQ < QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setSelectedOption(answers[currentQ + 1] || null); // Restore next selection if going forward again
      setCurrentQ(currentQ + 1);
    } else {
      setAnswers(newAnswers);
      setLoading(true);
      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traits: newAnswers })
        });
        const data = await res.json();
        
        if (res.ok && data.bike) {
          sessionStorage.setItem('quizResult', JSON.stringify({
            persona: data.persona,
            bikeId: data.bike.assigned_bike_id || data.bike.id,
            bikeModel: data.bike.model_name
          }));
          router.push('/upload');
        } else {
          alert('Failed to calculate persona. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        alert('Network error. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setSelectedOption(answers[currentQ - 1] || null);
    } else {
      router.push('/');
    }
  };

  const question = QUESTIONS[currentQ];
  const progress = ((currentQ + 1) / QUESTIONS.length) * 100;

  if (loading) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', marginTop: '100px' }} className="fade-in">
          <h2 className={styles.questionTitle}>Analyzing your traits...</h2>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </main>
    );
  }

  const getPremiumIcon = (id: string, isSelected: boolean) => {
    const color = isSelected ? "white" : "var(--text-secondary)";
    
    switch (id) {
      case 'Weekend Explorer':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>;
      case 'Daily Commuter':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="12" y1="6" x2="12" y2="6.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line></svg>;
      case 'Speed Enthusiast':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>;
      case 'Urban Nightscapes':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
      case 'Coastal Highways':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
      case 'Mountain Trails':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 8 5-5 5 15H2L8 3z"></path></svg>;
      case 'Iconic Blue':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>;
      case 'Dark Side':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
      case 'Dream Bike':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
      default:
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>;
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.topNav}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back
        </button>
      </div>

      <div className={styles.header}>
        <h1 className={styles.questionTitle}>{question.title}</h1>
        <p className={styles.subtitle}>Select an option to continue</p>
        
        <div className={styles.stepIndicator}>
          Step {currentQ + 1} <span className={styles.stepMuted}>of {QUESTIONS.length}</span>
        </div>
        
        <div className={styles.progressBarContainer}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className={styles.questionWrapper} key={currentQ}>
        <div className={styles.optionsList}>
          {question.options.map(opt => {
            const isSelected = selectedOption === opt.id;
            return (
              <button 
                key={opt.id} 
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => setSelectedOption(opt.id)}
              >
                <div className={styles.iconWrapper}>
                  {getPremiumIcon(opt.id, isSelected)}
                </div>
                <div className={styles.optionTextContent}>
                  <div className={styles.optionTitle}>{opt.title}</div>
                  <div className={styles.optionDesc}>{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.bottomAction}>
        <button 
          className={`${styles.nextButton} ${selectedOption ? styles.active : ''}`}
          onClick={handleNext}
          disabled={!selectedOption}
        >
          {currentQ < QUESTIONS.length - 1 ? 'Next' : 'Calculate Persona'}
        </button>
      </div>
    </main>
  );
}
