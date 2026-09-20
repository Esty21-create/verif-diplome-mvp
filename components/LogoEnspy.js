import { useState } from 'react';

// Cherche /public/logo-enspy.png (à déposer toi-même une fois obtenu
// officiellement). Si absent, affiche un simple monogramme à la place, pour
// ne pas utiliser le vrai logo de l'école avant un accord clair avec
// l'administration.
export default function LogoEnspy({ taille = 48 }) {
  const [erreur, setErreur] = useState(false);

  if (erreur) {
    return (
      <div
        style={{
          width: taille,
          height: taille,
          borderRadius: '50%',
          border: '1.5px solid #1e8449',
          background: '#eafaf1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: taille * 0.22,
          fontWeight: 'bold',
          color: '#1e8449',
          flexShrink: 0,
        }}
      >
        ENSPY
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-enspy.png"
      alt="Logo ENSPY"
      width={taille}
      height={taille}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      onError={() => setErreur(true)}
    />
  );
}
