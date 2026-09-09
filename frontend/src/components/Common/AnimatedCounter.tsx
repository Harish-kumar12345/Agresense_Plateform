import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.2
}) => {
  const spring = useSpring(0, {
    stiffness: 75,
    damping: 18,
    duration: duration * 1000
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;
  });

  const [renderedValue, setRenderedValue] = useState<string>(
    `${prefix}${value.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setRenderedValue(latest);
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <motion.span className={className}>
      {renderedValue}
    </motion.span>
  );
};

export default AnimatedCounter;
