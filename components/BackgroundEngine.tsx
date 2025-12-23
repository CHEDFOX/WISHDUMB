
import React, { useEffect, useRef } from 'react';
import { Scene } from '../types';
import { PARTICLE_COUNT } from '../constants';

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
}

interface BackgroundEngineProps {
  scene: Scene;
}

const BackgroundEngine: React.FC<BackgroundEngineProps> = ({ scene }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Init particles
    particles.current = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: Math.random() * 2000,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.2
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, '#050a05');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      let speedMultiplier = 1;
      if (scene === Scene.TRANSITIONING) speedMultiplier = 50;
      if (scene === Scene.CHAT) speedMultiplier = 2;

      particles.current.forEach((p) => {
        p.z -= speedMultiplier;

        if (p.z <= 0) {
          p.z = 2000;
          p.x = (Math.random() - 0.5) * 2000;
          p.y = (Math.random() - 0.5) * 2000;
        }

        const scale = 400 / (400 + p.z);
        const px = centerX + p.x * scale;
        const py = centerY + p.y * scale;

        const size = p.size * scale * (scene === Scene.TRANSITIONING ? 3 : 1);
        const alpha = p.opacity * (1 - p.z / 2000);

        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.beginPath();
        if (scene === Scene.TRANSITIONING) {
           // Stretch particles in transition
           ctx.ellipse(px, py, size, size * 5, Math.atan2(py - centerY, px - centerX) + Math.PI/2, 0, Math.PI * 2);
        } else {
           ctx.arc(px, py, size, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scene]);

  return <canvas ref={canvasRef} />;
};

export default BackgroundEngine;
