'use client';

import { motion } from 'framer-motion';
import { waveform } from '../lib/clinical';

export function EcgWave({ tone = 'green', height = 72 }: { tone?: 'green' | 'cyan' | 'red' | 'amber'; height?: number }) {
  const points = waveform(120);
  const color = {
    green: '#62ff9b',
    cyan: '#2ee8d6',
    red: '#ff5470',
    amber: '#ffc857'
  }[tone];
  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 360;
      const y = height / 2 - point * (height * 0.36);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="relative h-full min-h-[72px] overflow-hidden">
      <motion.svg
        viewBox={`0 0 360 ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-[140%]"
        animate={{ x: ['0%', '-28%'] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
      >
        <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />
      </motion.svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-60" />
    </div>
  );
}
