import { ICONS, type IconName } from '@/lib/icons';

interface Props {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 20, stroke = 2, className, label, style }: Props) {
  const filled = name === 'star' || name === 'play';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['flex-none', className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
