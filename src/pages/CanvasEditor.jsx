import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function CanvasEditor() {
  const { canvasId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeTool, setActiveTool] = useState('select');

  // Customization states
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [penColor, setPenColor] = useState('#3b82f6');
  const [penWidth, setPenWidth] = useState(4);
  const [isSaving, setIsSaving] = useState(false);

  // --- Index-Based History Engine ---
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isHistoryProcessing = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const saveStateToHistory = (canvas) => {
    if (isHistoryProcessing.current || !canvas) return;
    const jsonStr = JSON.stringify(canvas.toJSON());

    if (
      historyIndexRef.current >= 0 &&
      historyRef.current[historyIndexRef.current] === jsonStr
    ) {
      return;
    }

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(jsonStr);

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    updateUndoRedoState();
  };

  const undo = async () => {
    if (!fabricCanvas || historyIndexRef.current <= 0) return;
    isHistoryProcessing.current = true;
    historyIndexRef.current -= 1;

    const prevState = historyRef.current[historyIndexRef.current];
    const parsedState = JSON.parse(prevState);

    await fabricCanvas.loadFromJSON(parsedState);

    if (parsedState.backgroundColor) {
      setCanvasBg(parsedState.backgroundColor);
      fabricCanvas.backgroundColor = parsedState.backgroundColor;
    }

    fabricCanvas.renderAll();
    setSelectedObject(null);
    isHistoryProcessing.current = false;
    updateUndoRedoState();
  };

  const redo = async () => {
    if (!fabricCanvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryProcessing.current = true;
    historyIndexRef.current += 1;

    const nextState = historyRef.current[historyIndexRef.current];
    const parsedState = JSON.parse(nextState);

    await fabricCanvas.loadFromJSON(parsedState);

    if (parsedState.backgroundColor) {
      setCanvasBg(parsedState.backgroundColor);
      fabricCanvas.backgroundColor = parsedState.backgroundColor;
    }

    fabricCanvas.renderAll();
    setSelectedObject(null);
    isHistoryProcessing.current = false;
    updateUndoRedoState();
  };

  // 1. Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: false, // Standard behavior: active objects come to front
    });
    setFabricCanvas(canvas);

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      setSelectedObject(active || null);
      if (active) {
        const activeFill = active.get('fill') || active.get('stroke');
        if (typeof activeFill === 'string') {
          setSelectedColor(activeFill);
        }
      }
    };

    const handleModified = () => saveStateToHistory(canvas);

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    canvas.on('object:added', handleModified);
    canvas.on('object:modified', handleModified);
    canvas.on('object:removed', handleModified);
    canvas.on('path:created', handleModified);

    // Fetch existing document from Firestore
    const loadCanvas = async () => {
      try {
        const docRef = doc(db, 'canvases', canvasId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().canvasData) {
          const loadedData = typeof docSnap.data().canvasData === 'string'
            ? JSON.parse(docSnap.data().canvasData)
            : docSnap.data().canvasData;

          await canvas.loadFromJSON(loadedData);
          if (loadedData.backgroundColor) {
            setCanvasBg(loadedData.backgroundColor);
            canvas.backgroundColor = loadedData.backgroundColor;
          }
          canvas.renderAll();
        }
      } catch (err) {
        console.error("Error fetching canvas:", err);
      } finally {
        saveStateToHistory(canvas);
      }
    };

    loadCanvas();

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas.getActiveObject() && !canvas.getActiveObject().isEditing) {
          deleteSelected(canvas);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
    };
  }, [canvasId]);

  // 2. Freehand Pen Tool Mode
  useEffect(() => {
    if (!fabricCanvas) return;

    if (activeTool === 'pen') {
      fabricCanvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fabricCanvas);
      brush.color = penColor;
      brush.width = parseInt(penWidth, 10);
      fabricCanvas.freeDrawingBrush = brush;
    } else {
      fabricCanvas.isDrawingMode = false;
    }

    fabricCanvas.renderAll();
  }, [activeTool, penColor, penWidth, fabricCanvas]);

  // 3. Shape Creation
  const addRectangle = () => {
    if (!fabricCanvas) return;
    setActiveTool('select');
    const rect = new fabric.Rect({
      left: 200,
      top: 150,
      fill: selectedColor,
      width: 140,
      height: 90,
      rx: 6,
      ry: 6,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    setActiveTool('select');
    const circle = new fabric.Circle({
      left: 250,
      top: 150,
      fill: selectedColor,
      radius: 50,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
  };

  const addText = () => {
    if (!fabricCanvas) return;
    setActiveTool('select');
    const text = new fabric.IText('Edit Text', {
      left: 250,
      top: 200,
      fontSize: 28,
      fill: selectedColor,
      fontFamily: 'sans-serif',
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
  };

  // 4. Color & Canvas Changes
  const handleSelectedColorChange = (e) => {
    const color = e.target.value;
    setSelectedColor(color);
    if (selectedObject && fabricCanvas) {
      if (selectedObject.type === 'path') {
        selectedObject.set('stroke', color);
      } else {
        selectedObject.set('fill', color);
      }
      fabricCanvas.renderAll();
      saveStateToHistory(fabricCanvas);
    }
  };

  const handleCanvasBgChange = (e) => {
    const color = e.target.value;
    setCanvasBg(color);
    if (fabricCanvas) {
      fabricCanvas.backgroundColor = color;
      fabricCanvas.renderAll();
      saveStateToHistory(fabricCanvas);
    }
  };

  // 5. Delete & Clear
  const deleteSelected = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    const activeObjects = targetCanvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    activeObjects.forEach((obj) => targetCanvas.remove(obj));
    targetCanvas.discardActiveObject();
    targetCanvas.renderAll();
    setSelectedObject(null);
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = canvasBg;
    fabricCanvas.renderAll();
    setSelectedObject(null);
    saveStateToHistory(fabricCanvas);
  };

  // 6. Firestore Cloud Save & Export
  const saveCanvas = async () => {
    if (!fabricCanvas) return;
    setIsSaving(true);
    try {
      const jsonString = JSON.stringify(fabricCanvas.toJSON());
      await updateDoc(doc(db, 'canvases', canvasId), {
        canvasData: jsonString,
        updatedAt: serverTimestamp(),
      });
      alert('Canvas saved successfully!');
    } catch (err) {
      console.error("Firestore Save Error:", err);
      alert('Error saving canvas.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportPNG = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    const a = document.createElement('a');
    a.download = `canvas-${canvasId.slice(0, 6)}.png`;
    a.href = dataURL;
    a.click();
  };

  return (
    <div className="editor-container">
      {/* Top Header Navigation */}
      <header className="editor-header">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/')} className="btn-secondary">← Back</button>
          <div className="btn-secondary" style={{ fontFamily: 'monospace' }}>ID: {canvasId.slice(0, 8)}</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); }} className="btn-secondary">
            🔗 Share Link
          </button>
          <button onClick={exportPNG} className="btn-secondary">🖼️ Export PNG</button>
          <button onClick={saveCanvas} disabled={isSaving} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}>
            💾 {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main Toolbar */}
      <div className="editor-toolbar-wrapper">
        <div className="main-toolbar">
          <div className="tool-group">
            {/* Undo / Redo */}
            <button 
              onClick={undo} 
              disabled={!canUndo} 
              className="btn-tool" 
              style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
              title="Undo (Ctrl+Z)"
            >
              ↩️ Undo
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo} 
              className="btn-tool" 
              style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
              title="Redo (Ctrl+Y)"
            >
              ↪️ Redo
            </button>

            <div className="divider" />

            <button 
              onClick={() => setActiveTool('select')} 
              className={`btn-tool ${activeTool === 'select' ? 'active' : ''}`}
            >
              ↖ Select
            </button>

            <button onClick={addRectangle} className="btn-tool">⬛ Rectangle</button>
            <button onClick={addCircle} className="btn-tool">⚪ Circle</button>
            <button onClick={addText} className="btn-tool">🔤 Text</button>

            <button 
              onClick={() => setActiveTool('pen')} 
              className={`btn-tool ${activeTool === 'pen' ? 'active' : ''}`}
            >
              ✏️ Pen
            </button>

            {/* Pen Options */}
            {activeTool === 'pen' && (
              <div className="color-picker-box" style={{ borderColor: '#6366f1' }}>
                <span>Pen Color:</span>
                <input 
                  type="color" 
                  value={penColor} 
                  onChange={(e) => setPenColor(e.target.value)} 
                  className="color-input" 
                />
                <span style={{ marginLeft: '0.5rem' }}>Width:</span>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={penWidth} 
                  onChange={(e) => setPenWidth(e.target.value)} 
                  style={{ width: '60px' }}
                />
              </div>
            )}

            <div className="divider" />

            {/* Canvas Bg Picker */}
            <div className="color-picker-box">
              <span>Canvas Bg:</span>
              <input 
                type="color" 
                value={canvasBg} 
                onChange={handleCanvasBgChange} 
                className="color-input" 
              />
            </div>
          </div>

          <button onClick={clearCanvas} className="btn-secondary" style={{ color: '#ef4444' }}>🗑️ Clear</button>
        </div>

        {/* Selected Object Inspector */}
        {selectedObject && activeTool !== 'pen' && (
          <div className="sub-toolbar">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>SELECTED: <span style={{ color: '#818cf8' }}>{selectedObject.type.toUpperCase()}</span></span>
              <div className="color-picker-box">
                <span>Color:</span>
                <input 
                  type="color" 
                  value={selectedColor} 
                  onChange={handleSelectedColorChange} 
                  className="color-input" 
                />
              </div>
            </div>

            <button onClick={() => deleteSelected()} className="btn-delete">Delete Selected</button>
          </div>
        )}
      </div>

      {/* Canvas Workspace */}
      <main className="canvas-workspace">
        <div className="canvas-frame">
          <canvas ref={canvasRef} />
        </div>
      </main>
    </div>
  );
}