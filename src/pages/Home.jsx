import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createNewCanvas = async () => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'canvases'), {
        canvasData: JSON.stringify({ version: "5.3.0", objects: [] }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/canvas/${docRef.id}`);
    } catch (error) {
      console.error("Error creating canvas:", error);
      alert("Failed to create canvas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        
        <div className="pill-badge">
          ✨ Next-Gen Vector Design
        </div>

        <h1 className="hero-title">
          Bring Your Ideas to Life with <br />
          <span className="gradient-text">2D Canvas Editor</span>
        </h1>

        <p className="hero-description">
          Create custom shapes, draw freehand diagrams, and edit text seamlessly. Save your work instantly to the cloud and share with anyone.
        </p>

        <button onClick={createNewCanvas} disabled={loading} className="btn-primary">
          {loading ? <div className="spinner" /> : '🚀 Create New Canvas'}
        </button>

        <div className="feature-grid">
          <div className="feature-card">
            <div style={{ fontSize: '1.5rem' }}>🎨</div>
            <h3>Rich Shape Tools</h3>
            <p>Add rectangles, circles, and editable text with custom colors.</p>
          </div>

          <div className="feature-card">
            <div style={{ fontSize: '1.5rem' }}>✏️</div>
            <h3>Freehand Pen</h3>
            <p>Draw smooth freehand sketches and annotations effortlessly.</p>
          </div>

          <div className="feature-card">
            <div style={{ fontSize: '1.5rem' }}>☁️</div>
            <h3>Cloud Save</h3>
            <p>Persistent real-time storage powered by Firebase Firestore.</p>
          </div>
        </div>

      </div>
    </div>
  );
}