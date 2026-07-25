import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Sparkles, SlidersHorizontal, MapPin, Calendar, Heart, Plus, ThumbsUp, Check, AlertCircle } from 'lucide-react';

import { api } from '../api';

const DISTRICTS = ["조치원읍", "연서면", "전의면", "전동면", "금남면", "부강면", "소정면", "장군면", "연기면", "연동면", 
                   "한솔동", "도담동", "아름동", "종촌동", "고운동", "보람동", "소담동", "대평동", "새롬동", "다정동", "해밀동", "반곡동", "나성동", "어진동", "세종동"];
const ERAS = ["청동기", "삼국", "통일신라", "고려", "조선 전기", "조선 중기", "조선 후기", "조선", "근대", "현대"];

export default function Search({ onViewDetails, selectedCourseIds, onToggleCourse, isCitizenView, setIsCitizenView }) {
  const [searchMode, setSearchMode] = useState('filter'); // 'filter' | 'ai'
  const [query, setQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [heritages, setHeritages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // AI Chat states
  const [chatLog, setChatLog] = useState([
    { role: 'ai', text: '안녕하세요! 저는 세종시 문화유산 AI 큐레이터입니다. "전의면에 위치한 조선시대 절을 찾아줘" 처럼 자연어로 검색해보세요!' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Citizen Candidate states
  const [candidates, setCandidates] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    photo_url: '',
    gps_lat: 36.480,
    gps_lng: 127.289,
    reason: '',
    submitted_by: ''
  });
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    if (isCitizenView) {
      fetchCandidates();
    } else {
      fetchHeritages();
    }
  }, [isCitizenView, selectedDistrict, selectedEra]);

  const fetchHeritages = async () => {
    setLoading(true);
    try {
      const data = await api.getHeritageList(
        selectedDistrict,
        selectedEra,
        (query && searchMode === 'filter') ? query : ''
      );
      setHeritages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getCandidates();
      setCandidates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSearch = (e) => {
    e.preventDefault();
    fetchHeritages();
  };

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query;
    setChatLog(prev => [...prev, { role: 'user', text: userMessage }]);
    setQuery('');
    setAiLoading(true);

    try {
      const data = await api.aiSearch(userMessage);
      setChatLog(prev => [...prev, { role: 'ai', text: data.response_text }]);
      setHeritages(data.results);
    } catch (err) {
      console.error(err);
      setChatLog(prev => [...prev, { role: 'ai', text: '네트워크 연결 오류가 발생했습니다.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit new candidate
  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.submitCandidate(newCandidate);
      setShowSubmitModal(false);
      setNewCandidate({
        name: '',
        photo_url: '',
        gps_lat: 36.480,
        gps_lng: 127.289,
        reason: '',
        submitted_by: ''
      });
      fetchCandidates();
    } catch (err) {
      console.error(err);
    }
  };

  // Upvote/recommend candidate
  const handleRecommendCandidate = async (id) => {
    try {
      await api.recommendCandidate(id);
      fetchCandidates();
    } catch (err) {
      console.error(err);
    }
  };

  // Admin approval
  const handleApproveCandidate = async (id, status) => {
    try {
      await api.approveCandidate(id, status, '세종시청 문화예술과 담당자');
      fetchCandidates();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-view">
      
      {/* Title & Curation Tabs */}
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">{isCitizenView ? '시민 문화유산 제안 마당' : '세종시 문화유산 검색'}</h1>
          <p className="page-subtitle">
            {isCitizenView ? '시민들이 직접 발견하여 추천한 신규 문화유산 후보들을 살펴보고 등재를 위한 추천을 남겨보세요.' : '대화형 AI 인공지능 또는 조건 필터를 이용하여 세종시 문화유산을 검색하세요.'}
          </p>
        </div>
        
        {/* Toggle between Sejong master and Citizen proposals */}
        <div className="tab-group">
          <button className={`tab-btn ${!isCitizenView ? 'active' : ''}`} onClick={() => setIsCitizenView(false)}>
            세종 문화유산
          </button>
          <button className={`tab-btn ${isCitizenView ? 'active' : ''}`} onClick={() => setIsCitizenView(true)}>
            시민 추천 후보
          </button>
        </div>
      </div>

      {!isCitizenView ? (
        // Master Heritage Search Section
        <div className="search-container">
          
          {/* Mode Selector */}
          <div className="search-box-wrap">
            <div className="search-mode-select">
              <button className={`search-mode-btn ${searchMode === 'filter' ? 'active' : ''}`} onClick={() => setSearchMode('filter')}>
                <SlidersHorizontal size={18} /> 상세 조건 필터 검색
              </button>
              <button className={`search-mode-btn ${searchMode === 'ai' ? 'active' : ''}`} onClick={() => setSearchMode('ai')}>
                <Sparkles size={18} /> AI 대화형 탐색
              </button>
            </div>

            {searchMode === 'ai' ? (
              // AI Search Form
              <div>
                <div className="glass ai-chat-history">
                  {chatLog.map((chat, idx) => (
                    <div key={idx} className={`chat-bubble ${chat.role}`}>
                      {chat.text}
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="chat-bubble ai" style={{ opacity: 0.6 }}>
                      AI가 세종시 데이터베이스를 탐색하는 중입니다...
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleAiSearch} className="search-input-container">
                  <input 
                    type="text" 
                    placeholder="찾고 계신 소지재, 역사적 사실, 또는 원하는 성찰의 테마를 자유롭게 입력해 보세요..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input-field"
                  />
                  <button type="submit" className="search-submit-btn">
                    <Sparkles size={20} />
                  </button>
                </form>
              </div>
            ) : (
              // Filter-based Search Form
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handleFilterSearch} className="search-input-container">
                  <input 
                    type="text" 
                    placeholder="문화유산 명칭 또는 설명 키워드를 입력하세요..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input-field"
                  />
                  <button type="submit" className="search-submit-btn">
                    <SearchIcon size={20} />
                  </button>
                </form>
                
                <div className="filter-bar">
                  <select 
                    value={selectedDistrict} 
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">소재 지역 전체 (읍/면/동)</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <select 
                    value={selectedEra} 
                    onChange={(e) => setSelectedEra(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">시대 전체</option>
                    {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  
                  <button onClick={() => { setSelectedDistrict(''); setSelectedEra(''); setQuery(''); }} className="btn-secondary" style={{ borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    조건 초기화
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Grid */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '16px' }}>
              검색 결과 ({heritages.length}건)
            </h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-color)' }}>불러오는 중...</div>
            ) : heritages.length > 0 ? (
              <div className="grid-heritages">
                {heritages.map(h => {
                  const isAdded = selectedCourseIds.includes(h.h_id);
                  return (
                    <div key={h.h_id} className="glass heritage-card">
                      <div className="heritage-card-img-container">
                        <img 
                          src={`/images/${h.h_id}.webp`} 
                          alt={h.name} 
                          className="heritage-card-img"
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/400x300/1e293b/fff?text=No+Image';
                          }}
                        />
                        <span className="heritage-card-badge badge-era">{h.era}</span>
                        <span className="badge-district">{h.district}</span>
                      </div>
                      <div className="heritage-card-body">
                        <h3 className="heritage-card-title">{h.name}</h3>
                        <p className="heritage-card-description">{h.description}</p>
                        
                        {/* Transit note mockup */}
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
                          <span>버스로 35분</span>
                          <span style={{ color: 'var(--border-color)' }}>|</span>
                          <span>자차로 15분</span>
                        </div>

                        <div className="heritage-card-footer">
                          <button className="btn-secondary" onClick={() => onViewDetails(h.h_id)} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                            자세히 보기
                          </button>
                          
                          <button 
                            className={`btn-card-action ${isAdded ? 'btn-secondary' : ''}`}
                            onClick={() => onToggleCourse(h.h_id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isAdded ? (
                              <>
                                <Check size={14} /> 추가됨
                              </>
                            ) : (
                              <>
                                <Plus size={14} /> 코스 추가
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
                검색 조건에 맞는 문화유산이 없습니다. 다른 조건으로 검색해보세요.
              </div>
            )}
          </div>

        </div>
      ) : (
        // Citizen Candidate Master Page
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button className="btn-card-action" onClick={() => setShowSubmitModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> 내가 찾은 문화유산 추천하기
            </button>
            
            <button className={`btn-secondary ${isAdminMode ? 'active' : ''}`} onClick={() => setIsAdminMode(!isAdminMode)} style={{ fontSize: '0.85rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              {isAdminMode ? '관리자 모드 종료' : '담당자 검토 패널'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-color)' }}>불러오는 중...</div>
          ) : candidates.length > 0 ? (
            <div className="grid-heritages">
              {candidates.map(c => {
                const isApproved = c.status === '승인' || c.status === '승인(공개)';
                // Render candidate card
                if (!isApproved && !isAdminMode && c.status !== '신청중') return null; // Show only approved or reviewable pending ones
                
                return (
                  <div key={c.id} className="glass heritage-card" style={{ height: 'auto', minHeight: '380px' }}>
                    <div className="heritage-card-img-container" style={{ height: '160px' }}>
                      <img 
                        src={c.photo_url || 'https://placehold.co/400x300/1e293b/fff?text=No+Image'} 
                        alt={c.name} 
                        className="heritage-card-img"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/400x300/1e293b/fff?text=No+Image';
                        }}
                      />
                      <span className="heritage-card-badge" style={{ 
                        backgroundColor: c.status === '승인' || c.status === '승인(공개)' ? 'rgba(16, 185, 129, 0.2)' : 
                                        c.status === '반려' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: c.status === '승인' || c.status === '승인(공개)' ? '#a7f3d0' : 
                               c.status === '반려' ? '#fca5a5' : '#fde68a',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {c.status}
                      </span>
                    </div>
                    
                    <div className="heritage-card-body">
                      <h3 className="heritage-card-title">{c.name}</h3>
                      <p className="heritage-card-description" style={{ marginBottom: '8px' }}>
                        <strong>추천 사유:</strong> {c.reason}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        <span>제출자: {c.submitted_by}</span>
                        <span>|</span>
                        <span>위치: {c.gps_lat.toFixed(4)}, {c.gps_lng.toFixed(4)}</span>
                      </div>

                      {isAdminMode && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>행정 승인 도구</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleApproveCandidate(c.id, '승인')} className="btn-card-action" style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}>승인</button>
                            <button onClick={() => handleApproveCandidate(c.id, '반려')} className="btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '6px', color: 'var(--danger-color)' }}>반려</button>
                          </div>
                        </div>
                      )}

                      <div className="heritage-card-footer" style={{ marginTop: 'auto' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>동의자 수: <strong>{c.recommend_count}명</strong></span>
                        <button className="btn-secondary" onClick={() => handleRecommendCandidate(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderRadius: '8px' }}>
                          <ThumbsUp size={14} /> 추천 동의
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
              등록된 시민 추천 문화유산 후보가 없습니다. 첫 후보를 시에 제안해 보세요!
            </div>
          )}
        </div>
      )}

      {/* Citizen Heritage Submission Form Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="glass modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', maxHeight: '90vh' }}>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>신규 문화유산 후보 제안</h2>
                <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCandidateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>문화유산 명칭 *</label>
                  <input 
                    type="text"
                    required
                    placeholder="예: 장군면 고택지"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>사진 이미지 웹 URL 링크</label>
                  <input 
                    type="text"
                    placeholder="웹 이미지 주소를 적어주세요 (예: https://...)"
                    value={newCandidate.photo_url}
                    onChange={(e) => setNewCandidate({...newCandidate, photo_url: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>위도 (Latitude) *</label>
                    <input 
                      type="number"
                      step="any"
                      required
                      value={newCandidate.gps_lat}
                      onChange={(e) => setNewCandidate({...newCandidate, gps_lat: parseFloat(e.target.value)})}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>경도 (Longitude) *</label>
                    <input 
                      type="number"
                      step="any"
                      required
                      value={newCandidate.gps_lng}
                      onChange={(e) => setNewCandidate({...newCandidate, gps_lng: parseFloat(e.target.value)})}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                    />
                  </div>
                </div>
                
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  * 모바일 환경에서는 GPS 연동으로 채워지며, 웹에서는 지도 지정 또는 기본 위경도 입력이 수행됩니다.
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>추천 사유 및 소개 *</label>
                  <textarea 
                    required
                    rows="4"
                    placeholder="이 문화유산의 역사적 배경이나 개인적인 발견 사유를 상세하게 작성해 주세요."
                    value={newCandidate.reason}
                    onChange={(e) => setNewCandidate({...newCandidate, reason: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>제출자 성명/닉네임 *</label>
                  <input 
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={newCandidate.submitted_by}
                    onChange={(e) => setNewCandidate({...newCandidate, submitted_by: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                  />
                </div>

                <button type="submit" className="btn-card-action" style={{ padding: '12px', marginTop: '12px', fontSize: '1rem' }}>
                  후보 제안 완료
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
