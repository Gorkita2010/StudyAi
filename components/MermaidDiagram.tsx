
import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (contentRef.current && chart) {
      try {
        // Assume mermaid is loaded via CDN in index.html
        const mermaid = (window as any).mermaid;
        if (mermaid) {
          mermaid.render(`mermaid-${Date.now()}`, chart).then((result: any) => {
              if (contentRef.current) {
                  contentRef.current.innerHTML = result.svg;
                  // Reset view on new chart
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
              }
          });
        } else {
            if (contentRef.current) contentRef.current.innerHTML = "Mermaid library not loaded.";
        }
      } catch (e) {
        console.error('Mermaid render error:', e);
        if (contentRef.current) contentRef.current.innerHTML = "Invalid Diagram Syntax";
      }
    }
  }, [chart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[500px] bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700">
       {/* Diagram Container */}
       <div 
         ref={containerRef}
         className={`w-full h-full cursor-move ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
       >
          <div 
            ref={contentRef}
            style={{ 
               transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
               transformOrigin: 'center',
               transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            className="w-full h-full flex items-center justify-center p-10"
          />
       </div>

       {/* Controls */}
       <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
          <button onClick={zoomIn} className="w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg border border-slate-600 hover:bg-slate-700 flex items-center justify-center font-bold text-xl" title="Zoom In">
             +
          </button>
          <button onClick={zoomOut} className="w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg border border-slate-600 hover:bg-slate-700 flex items-center justify-center font-bold text-xl" title="Zoom Out">
             -
          </button>
          <button onClick={reset} className="w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg border border-slate-600 hover:bg-slate-700 flex items-center justify-center font-bold" title="Reset View">
             ↺
          </button>
       </div>
       
       <div className="absolute top-4 left-4 bg-black/30 px-3 py-1 rounded text-xs text-slate-400 pointer-events-none">
          Drag to pan • Scroll to zoom
       </div>
    </div>
  );
};

export default MermaidDiagram;
