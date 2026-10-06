import React, { useState } from 'react';
import { Camera } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  iconClassName?: string;
  textClassName?: string;
}

/**
 * Image component with robust safety fallback.
 * If the image src is missing, empty, invalid, or fails to load (onError),
 * it displays a neutral placeholder box with a camera icon and the text "No photo available".
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = 'Infrastructure hazard',
  className = 'w-full h-full object-cover',
  fallbackClassName = '',
  iconClassName = '',
  textClassName = '',
  onError,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  const isMissing = !src || typeof src !== 'string' || src.trim().length === 0;

  if (isMissing || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-800/90 text-slate-300 border border-slate-700/60 select-none p-3 transition-colors ${
          fallbackClassName || className
        }`}
        role="img"
        aria-label="No photo available"
      >
        <div className="flex flex-col items-center justify-center gap-1.5 text-center">
          <div className="w-8 h-8 rounded-full bg-slate-700/80 flex items-center justify-center text-slate-300 shadow-inner">
            <Camera className={iconClassName || 'w-4 h-4'} />
          </div>
          <span className={textClassName || 'text-[11px] font-semibold text-slate-300 tracking-wide'}>
            No photo available
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
      {...rest}
    />
  );
};
