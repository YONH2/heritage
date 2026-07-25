import React, { useState, useEffect } from 'react';
import { Map, Navigation, Trash, Calendar, Printer, Save, AlertTriangle, HelpCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';

import { api } from '../api';
const GOOGLE_MAPS_KEY = ''; // Can be set via props or window config

export default function CourseMaker({ selectedCourseIds, onToggleCourse, clearCourse }) {
  const [heritages, setHeritages] = useState([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [transportMode, setTransportMode] = useState('car'); // 'car' | 'bus' | 'walk'
  const [theme, setTheme] = useState('magazine'); // 'magazine' | 'fairy'
  const [saving, setSaving] = useState(false);
  const [savedCourse, setSavedCourse] = useState(null);
  
  // Maps API loader
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY || window.GOOGLE_MAPS_API_KEY || ''
  });

  const [activeMarker, setActiveMarker] = useState(null);

  useEffect(() => {
    fetchSelectedHeritages();
  }, [selectedCourseIds]);

  const fetchSelectedHeritages = async () => {
    if (selectedCourseIds.length === 0) {
      setHeritages([]);
      return;
    }
    
    try {
      const data = await api.getHeritageList();
      // Maintain the selection order
      const ordered = selectedCourseIds
        .map(id => data.find(h => h.h_id === id))
        .filter(Boolean);
      setHeritages(ordered);
    } catch (err) {
      console.error(err);
    }
  };

  // Distance calculation heuristics
  const getDistanceKm = (h1, h2) => {
    const lat1 = h1.gps_lat;
    const lon1 = h1.gps_lng;
    const lat2 = h2.gps_lat;
    const lon2 = h2.gps_lng;
    // Haversine formula
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate totals
  let totalDistance = 0;
  for (let i = 0; i < heritages.length - 1; i++) {
    totalDistance += getDistanceKm(heritages[i], heritages[i+1]);
  }

  const getEstimatedTimeStr = (distKm, mode) => {
    let speed = 40; // km/h for car
    if (mode === 'bus') speed = 25;
    if (mode === 'walk') speed = 4;
    
    const timeHours = distKm / speed;
    const totalMinutes = Math.round(timeHours * 60) + (heritages.length * 20); // Add 20 minutes stay per spot
    
    if (totalMinutes < 60) {
      return `${totalMinutes}분`;
    }
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간`;
  };

  const estimatedTime = getEstimatedTimeStr(totalDistance, transportMode);

  // Save the course and call backend for AI content
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim() || heritages.length === 0) return;

    setSaving(true);
    try {
      const data = await api.saveCourse(
        courseTitle,
        heritages.map(h => h.h_id),
        transportMode,
        estimatedTime,
        theme
      );
      setSavedCourse(data);
      clearCourse();
      setCourseTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Fallback Canvas Map implementation for zero-config offline runs
  const renderFallbackMap = () => {
    const defaultLat = 36.480;
    const defaultLng = 127.289;
    
    // Grid coordinate mapping helper
    const getCoordinates = (lat, lng) => {
      // Sejong bounding box roughly: Lat 36.42 to 36.75, Lng 127.15 to 127.40
      const width = 100;
      const height = 100;
      
      const x = ((lng - 127.15) / (127.40 - 127.15)) * width;
      const y = (1 - (lat - 36.42) / (36.75 - 36.42)) * height; // Invert y for canvas coordinate origin top-left
      
      return { x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) };
    };

    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#0f172a', position: 'relative' }}>
        
        {/* SVG Drawing of Grid & Path lines */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', left: 0, top: 0, zIndex: 1 }}>
          {/* Draw connecting lines between selected spots */}
          {heritages.map((h, idx) => {
            if (idx === heritages.length - 1) return null;
            const p1 = getCoordinates(h.gps_lat, h.gps_lng);
            const p2 = getCoordinates(heritages[idx+1].gps_lat, heritages[idx+1].gps_lng);
            return (
              <line 
                key={idx}
                x1={`${p1.x}%`} 
                y1={`${p1.y}%`} 
                x2={`${p2.x}%`} 
                y2={`${p2.y}%`} 
                stroke="#10b981" 
                strokeWidth="3" 
                strokeDasharray="5,5"
              />
            );
          })}
        </svg>

        {/* Draw Markers */}
        {heritages.map((h, idx) => {
          const coords = getCoordinates(h.gps_lat, h.gps_lng);
          return (
            <div 
              key={h.h_id}
              onClick={() => setActiveMarker(h)}
              style={{
                position: 'absolute',
                left: `${coords.x}%`,
                top: `${coords.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '3px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(16,185,129,0.8)',
                zIndex: 10
              }}
              title={h.name}
            >
              {idx + 1}
            </div>
          );
        })}

        {/* Selected Marker Detail Card Popover */}
        {activeMarker && (
          <div className="glass" style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            padding: '16px',
            borderRadius: '12px',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{activeMarker.name}</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeMarker.location}</span>
            </div>
            <button className="btn-secondary" onClick={() => setActiveMarker(null)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>닫기</button>
          </div>
        )}

        <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', zIndex: 10, border: '1px solid var(--border-color)' }}>
          오프라인 벡터 지도 모드 (Sejong City Grid Map)
        </div>
      </div>
    );
  };

  return (
    <div className="page-view">
      
      {/* Title */}
      <div className="page-title-section">
        <h1 className="page-title">AI 나만의 답사 코스 설계</h1>
        <p className="page-subtitle">여러 문화유산을 선택해 자신만의 답사 코스를 만들고, 동화 또는 역사 잡지 형태의 AI 큐레이션 콘텐츠를 생성해 보세요.</p>
      </div>

      {savedCourse ? (
        // Saved Course AI Content Output View
        <div className="glass" style={{ padding: '40px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{savedCourse.title}</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>이동 수단: {savedCourse.transport_mode === 'car' ? '자차' : savedCourse.transport_mode === 'bus' ? '대중교통' : '도보'} | 소요 시간: {savedCourse.estimated_time}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 18px', borderRadius: '10px' }}>
                <Printer size={18} /> 인쇄하기
              </button>
              <button className="btn-card-action" onClick={() => setSavedCourse(null)} style={{ padding: '10px 18px', borderRadius: '10px' }}>
                새 코스 만들기
              </button>
            </div>
          </div>

          <div style={{ whiteSpace: 'pre-line', fontSize: '1.05rem', color: '#e2e8f0', lineHeight: 1.8, backgroundColor: 'rgba(255,255,255,0.01)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {savedCourse.content}
          </div>
        </div>
      ) : (
        // Main Custom Course Maker Panels
        <div className="course-maker-layout">
          
          {/* Map View Panel */}
          <div className="map-container-wrap">
            {GOOGLE_MAPS_KEY && isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{ lat: 36.480, lng: 127.289 }}
                zoom={11}
              >
                {heritages.map((h, idx) => (
                  <Marker 
                    key={h.h_id}
                    position={{ lat: h.gps_lat, lng: h.gps_lng }}
                    label={`${idx+1}`}
                    onClick={() => setActiveMarker(h)}
                  />
                ))}
                {heritages.length > 1 && (
                  <Polyline 
                    path={heritages.map(h => ({ lat: h.gps_lat, lng: h.gps_lng }))}
                    options={{ strokeColor: '#10b981', strokeOpacity: 0.8, fontWeight: 3 }}
                  />
                )}
              </GoogleMap>
            ) : (
              renderFallbackMap()
            )}
          </div>

          {/* Configuration & Selection Panel */}
          <div className="course-drawer">
            <div className="glass course-summary-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>경로 정보</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>선택된 문화유산 수:</span>
                  <span>{heritages.length}개</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>총 거리:</span>
                  <span>{totalDistance.toFixed(2)} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>소요 시간 (방문 시간 포함):</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{estimatedTime}</span>
                </div>
              </div>

              {/* Transit option selection */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button className={`tab-btn ${transportMode === 'car' ? 'active' : ''}`} onClick={() => setTransportMode('car')} style={{ flex: 1 }}>자차</button>
                <button className={`tab-btn ${transportMode === 'bus' ? 'active' : ''}`} onClick={() => setTransportMode('bus')} style={{ flex: 1 }}>버스</button>
                <button className={`tab-btn ${transportMode === 'walk' ? 'active' : ''}`} onClick={() => setTransportMode('walk')} style={{ flex: 1 }}>도보</button>
              </div>
            </div>

            {/* Custom List of Chosen spots */}
            <div className="course-list-panel">
              {heritages.length > 0 ? (
                heritages.map((h, idx) => (
                  <div key={h.h_id} className="glass course-item-card">
                    <div className="course-item-info">
                      <span className="course-item-name">{idx+1}. {h.name}</span>
                      <span className="course-item-meta">{h.district} | {h.era}</span>
                    </div>
                    <button className="btn-secondary" onClick={() => onToggleCourse(h.h_id)} style={{ padding: '6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}>
                      <Trash size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <Navigation size={32} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.85rem' }}>검색 탭에서 문화유산을 추가하여 경로를 설계하세요.</p>
                </div>
              )}
            </div>

            {/* Save Curation Form */}
            {heritages.length > 0 && (
              <form onSubmit={handleSaveCourse} className="glass" style={{ padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="코스 이름 (예: 한솔동 주말 답사)"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.9rem' }}
                  />
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI 큐레이션 테마:</span>
                    <select 
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#131722', color: '#fff', fontSize: '0.8rem' }}
                    >
                      <option value="magazine">역사 잡지 스타일</option>
                      <option value="fairy">어린이 구전 동화</option>
                    </select>
                  </div>

                  <button type="submit" disabled={saving} className="btn-card-action" style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Save size={16} /> {saving ? 'AI 생성중...' : '여행 코스 저장 & 큐레이션 생성'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
