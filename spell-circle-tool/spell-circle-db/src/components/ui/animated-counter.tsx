'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export function AnimatedCounter({
  value,
  duration = 500,
  className = '',
  formatFn = (v) => v.toString(),
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const diff = endValue - startValue;

    if (diff === 0) return;

    const startTime = performance.now();

    // Spring-like easing function
    const easeOutSpring = (t: number): number => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };

    // Smoother ease out
    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use spring for small changes, quart for larger ones
      const eased = Math.abs(diff) > 10 ? easeOutQuart(progress) : easeOutSpring(progress);
      
      const current = Math.round(startValue + diff * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {formatFn(displayValue)}
    </span>
  );
}

// Simpler version that just counts up/down without physics
export function SimpleCounter({
  value,
  duration = 400,
  className = '',
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const start = previousValue.current;
    const end = value;
    const diff = end - start;

    if (diff === 0) return;

    const startTime = performance.now();
    let animationId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(start + diff * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        previousValue.current = end;
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{displayValue}</span>;
}


