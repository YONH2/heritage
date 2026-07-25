import React, { useState, useEffect } from 'react';
import { Briefcase, Heart, BookOpen, Clock, Navigation, MapPin, CheckCircle, Clock3, AlertTriangle, XCircle, Printer } from 'lucide-react';

import { api } from '../api';

export default function MyCuration({ activeTabCuration }) {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'suggestions'
  const [courses, setCourses] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  useEffect(() => {
    // If parent sidebar button triggers it, sync active tab
    if (activeTabCuration) {
      setActiveTab(activeTabCuration);
    }
  }, [activeTabCuration]);

  useEffect(() => {
    fetchCurationData();
  }, [activeTab]);

  const fetchCurationData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'courses') {
        const data = await api.getCourses('sejong_citizen');
        setCourses(data);
      } else {
        const data = await api.getCandidates();
        // Filter candidates submitted by our default user '홍길동' or show all for convenience
        // In SQLite seed, user name is what they type. For MVP, we will list submissions by '홍길동' or all submissions
        setSuggestions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case '승인':
      case '승인(공개)':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
            <CheckCircle size={14} /> 등재 완료
          </span>
        );
      case '반려':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
            <XCircle size={14} /> 반려됨
          </span>
        );
      case '담당자 검토중':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600 }}>
            <Clock3 size={14} /> 검토중
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
            <Clock size={14} /> 신청 완료
          </span>
        );
    }
  };

  const printSpecificCourse = (course) => {
    // Write temporary print style variables or open new window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${course.title} - 세종시 문화유산 AI 큐레이션</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; }
            h1 { border-bottom: 2px solid #059669; padding-bottom: 12px; color: #059669; }
            .meta { color: #555; margin-bottom: 20px; font-weight: bold; }
            .route { display: flex; gap: 8px; font-size: 1.1rem; color: #111; margin-bottom: 30px; font-weight: bold; }
            .content { white-space: pre-line; background-color: #f3f4f6; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>${course.title}</h1>
          <div class="meta">이동 방법: ${course.transport_mode === 'car' ? '자차' : course.transport_mode === 'bus' ? '버스' : '도보'} | 예상 소요 시간: ${course.estimated_time}</div>
          <div class="route">답사 경로: ${course.heritages.map(h => h.name).join(' -> ')}</div>
          <h2>AI 가이드 큐레이션 스토리</h2>
          <div class="content">${course.created_content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="page-view">
      
      {/* Title */}
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">나만의 문화유산 목록</h1>
          <p className="page-subtitle">내가 직접 만든 답사 코스와 시청에 등재 제안한 신규 문화유산 후보 이력을 조회하고 관리합니다.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="tab-group">
          <button className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            내가 만든 코스
          </button>
          <button className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveTab('suggestions')}>
            내가 추천한 문화유산
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-color)' }}>불러오는 중...</div>
      ) : activeTab === 'courses' ? (
        // Courses List Panel
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {courses.length > 0 ? (
            courses.map(c => {
              const isExpanded = expandedCourseId === c.id;
              return (
                <div key={c.id} className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{c.title}</h3>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> 소요 시간: {c.estimated_time}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={14} /> 이동수단: {c.transport_mode === 'car' ? '자차' : c.transport_mode === 'bus' ? '대중교통' : '도보'}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => printSpecificCourse(c)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', borderRadius: '8px' }}>
                        <Printer size={14} /> 인쇄
                      </button>
                      <button className="btn-card-action" onClick={() => setExpandedCourseId(isExpanded ? null : c.id)} style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px' }}>
                        {isExpanded ? '닫기' : '큐레이션 읽기'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>답사 코스:</span>
                    {c.heritages.map((h, idx) => (
                      <span key={h.h_id} style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {h.name} {idx < c.heritages.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '20px', padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>
                        <BookOpen size={16} /> AI 가이드 콘텐츠
                      </div>
                      {c.created_content}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
              내가 만든 여행 답사 코스가 없습니다. 코스 만들기 탭에서 첫 코스를 설계해 보세요.
            </div>
          )}
        </div>
      ) : (
        // Suggested Candidates Status Log Panel
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {suggestions.length > 0 ? (
            suggestions.map(s => (
              <div key={s.id} className="glass" style={{ padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{s.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>이유:</strong> {s.reason}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span>위치: {s.gps_lat.toFixed(4)}, {s.gps_lng.toFixed(4)}</span>
                    <span>|</span>
                    <span>제출인: {s.submitted_by}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {getStatusBadge(s.status)}
                  {s.reviewed_at && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>검토일자: {s.reviewed_at.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
              제출 제안한 문화유산 후보가 없습니다.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
