
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  barColor: string; // Expected as RGB string "255, 0, 0"
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying, barColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear transparently to let background show through
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      const [rBase, gBase, bBase] = barColor.split(',').map(n => parseInt(n.trim()));

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Add slight variation based on frequency index for visual depth
        const alpha = 0.5 + (dataArray[i] / 510); // 0.5 to 1.0
        
        ctx.fillStyle = `rgba(${rBase}, ${gBase}, ${bBase}, ${alpha})`;
        
        // Dynamic glow
        if (barHeight > 10) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgb(${rBase},${gBase},${bBase})`;
        } else {
            ctx.shadowBlur = 0;
        }

        // Rounded bars
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight * 1.5, barWidth, barHeight * 1.5, 4);
        ctx.fill();

        x += barWidth + 2;
      }
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser, isPlaying, barColor]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-full opacity-90"
    />
  );
};

export default AudioVisualizer;
