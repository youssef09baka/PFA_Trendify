import React, { useState, useMemo } from 'react';

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

  const hasImage = Boolean(src || poster);
  const hasVideo = Boolean(video);

  const showImage = hasImage && !error;
  const showVideo = hasVideo && !videoError;

  return (
    <div className={`media-box ${className}`} style={{ paddingTop }}>
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
          src={src || poster}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          onError={() => setError(true)}
        />
      ) : (
        <div className="media-placeholder">
          <div style={{ textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.9 }}>
              <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" />
              <path d="M7 9l3 3 4-4 5 5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>Aucun média</div>
          </div>
        </div>
      )}
    </div>
  );
}
