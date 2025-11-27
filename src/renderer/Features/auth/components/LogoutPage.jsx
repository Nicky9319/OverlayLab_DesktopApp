import React, { useEffect, useState } from 'react';
import { clearToken } from '../../../../utils/clerkTokenProvider';

const LogoutPage = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Clear token immediately
    clearToken();

    // Animate dots (typewriter effect - cycles through 0, 1, 2, 3 dots)
    let dotCount = 0;
    const dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4; // Cycle 0, 1, 2, 3
      setDots('.'.repeat(dotCount));
    }, 400);

    // Wait a moment to show the message, then send IPC to main process
    const timer = setTimeout(() => {
      if (window.electronAPI && window.electronAPI.signOut) {
        window.electronAPI.signOut().catch((error) => {
          console.error('Error during sign out IPC:', error);
        });
      } else {
        console.warn('electronAPI.signOut not available');
      }
    }, 1500); // Show message for 1.5 seconds before triggering logout

    return () => {
      clearInterval(dotInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000000',
      color: '#FFFFFF'
    }}>
      <div style={{
        fontSize: '24px',
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        Logging out{dots}
      </div>
    </div>
  );
};

export default LogoutPage;

