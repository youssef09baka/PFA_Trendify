import React, { useMemo, useState } from 'react';
import { isPlaceholderMedia, getCardMediaUrl } from '../utils/media';

// MediaBox: unified media container for images & video with fixed aspect ratios
// Props:
// - src: image url
// - video: video url
// - poster: poster image url
// - alt: alt text
// - aspect: '16:9' | '3:2' | 'square' (default '16:9')
// - lazy: boolean (default true)
// - muted, autoPlay, controls
// - className: additional classes

export default function MediaBox({ src, video, poster, alt = '', aspect = '16:9', lazy = true, muted = true, autoPlay = false, controls = false, className = '' }) {
  const [error, setError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const paddingTop = useMemo(() => {
    switch (aspect) {
      case '3:2':
        return '66.6667%';
      case 'square':
        return '100%';
      case '16:9':
      default:
        return '56.25%';
    }
  }, [aspect]);

  const primarySrc = useMemo(() => getCardMediaUrl({ image: src, thumbnail: poster, poster }), [src, poster]);
  const fallbackSrc = useMemo(() => getCardMediaUrl({ image: poster, thumbnail: src, poster: src }), [src, poster]);
  const [activeSrc, setActiveSrc] = useState(() => primarySrc || fallbackSrc || '');

  const hasImage = Boolean(activeSrc) && !isPlaceholderMedia(activeSrc);
  const hasVideo = Boolean(video);

  const showImage = hasImage && !error;
  const showVideo = hasVideo && !videoError;

  const handleImageError = () => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
      return;
    }
    setError(true);
  };

  return (
    <div className={`media-box ${className}`} style={{ paddingTop, width: '100%', position: 'relative', overflow: 'hidden', background: 'var(--glass)', minHeight: '120px' }}>
      {showVideo ? (
        <video
          src={video}
          poster={poster || src}
          muted={muted}
          autoPlay={autoPlay}
          controls={controls}
          playsInline
          onError={() => setVideoError(true)}
        />
      ) : showImage ? (
        <img
          src={activeSrc}
          alt={alt || 'Visuel de tendance'}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onError={handleImageError}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div className="media-placeholder" aria-hidden="true">Aucun visuel</div>
      )}
    </div>
  );
}
