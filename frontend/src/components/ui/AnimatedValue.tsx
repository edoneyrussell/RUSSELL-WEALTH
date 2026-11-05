import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string | number;
  className?: string;
};

export default function AnimatedValue({
  value,
  className = '',
}: Props) {
  const previous = useRef(value);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (previous.current === value) return;

    previous.current = value;
    setAnimate(true);

    const timeout = window.setTimeout(() => {
      setAnimate(false);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [value]);

  return (
    <span
      className={`${className} ${animate ? 'rw-value-updated' : ''}`}
    >
      {value}
    </span>
  );
}
