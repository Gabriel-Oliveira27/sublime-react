// components/store/LocationMapModal.jsx
'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMapModal.module.css';

/**
 * Modal estilo iFood para ajuste de localização.
 *
 * Leaflet é AUTO-HOSPEDADO (npm + import dinâmico). A versão por CDN
 * (unpkg.com) era bloqueada pela CSP em produção — o modal abria com o
 * mapa em branco e o fluxo de GPS/mapa "não abria nada".
 *
 * Props:
 *   initialLat / initialLon — coordenadas GPS para centrar o mapa
 *   onConfirm(addr)          — chamado com objeto de endereço preenchido
 *   onClose()
 */
export default function LocationMapModal({ initialLat, initialLon, onConfirm, onClose }) {
  const mapRef      = useRef(null);
  const markerRef   = useRef(null);
  const mapInstance = useRef(null);
  const [coords,    setCoords]    = useState({ lat: initialLat || -15.78, lon: initialLon || -47.93 });
  const [loading,   setLoading]   = useState(false);
  const [address,   setAddress]   = useState('');

  /* ── Carrega Leaflet (bundle próprio, import dinâmico) ── */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    let cancelled = false;

    const initMap = (L) => {
      if (cancelled || !mapRef.current || mapInstance.current) return;
      const lat = initialLat || -15.78;
      const lon = initialLon || -47.93;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lon], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;background:#E84D82;border:3px solid white;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          box-shadow:0 3px 12px rgba(232,77,130,.5)">
        </div>`,
        iconAnchor: [16, 32],
      });

      const marker = L.marker([lat, lon], { draggable: true, icon }).addTo(map);
      markerRef.current = marker;
      mapInstance.current = map;

      const updateCoords = (latlng) => {
        setCoords({ lat: latlng.lat, lon: latlng.lng });
        setAddress(''); // reset quando mover
      };

      marker.on('dragend', () => updateCoords(marker.getLatLng()));
      map.on('click', e => { marker.setLatLng(e.latlng); updateCoords(e.latlng); });
    };

    import('leaflet')
      .then(mod => initMap(mod.default ?? mod))
      .catch(err => console.error('[LocationMapModal] falha ao carregar o Leaflet:', err));

    return () => {
      cancelled = true;
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  /* ── Reverse geocode via Nominatim ── */
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
      );
      const data = await res.json();
      const a    = data.address || {};

      const STATE_MAP = {
        'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA',
        'Ceará':'CE','Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO',
        'Maranhão':'MA','Mato Grosso':'MT','Mato Grosso do Sul':'MS',
        'Minas Gerais':'MG','Pará':'PA','Paraíba':'PB','Paraná':'PR',
        'Pernambuco':'PE','Piauí':'PI','Rio de Janeiro':'RJ','Rio Grande do Norte':'RN',
        'Rio Grande do Sul':'RS','Rondônia':'RO','Roraima':'RR','Santa Catarina':'SC',
        'São Paulo':'SP','Sergipe':'SE','Tocantins':'TO',
      };

      const addr = {
        street:       a.road || a.pedestrian || '',
        number:       a.house_number || '',
        complement:   '',
        neighborhood: a.suburb || a.neighbourhood || a.quarter || a.district || '',
        city:         a.city || a.town || a.village || a.municipality || '',
        state:        STATE_MAP[a.state] || (a.state || '').slice(0, 2).toUpperCase(),
        cep:          (a.postcode || '').replace(/\D/g, ''),
        referencia:   '',
        lat:          coords.lat,
        lon:          coords.lon,
      };

      setAddress([addr.street, addr.number, addr.neighborhood, addr.city].filter(Boolean).join(', '));
      onConfirm(addr);
    } catch {
      onConfirm({ lat: coords.lat, lon: coords.lon }); // pass coords even if geocode fails
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Confirme sua localização</h3>
            <p className={styles.sub}>Arraste o marcador ou clique no mapa para ajustar</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div ref={mapRef} className={styles.map} />

        {address && (
          <div className={styles.addressPreview}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{address}</span>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <><span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,.3)' }} /> Buscando…</>
            ) : 'Confirmar localização'}
          </button>
        </div>
      </div>
    </div>
  );
}
