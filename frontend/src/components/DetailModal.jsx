import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Heart, MapPin, Calendar, BookOpen } from 'lucide-react';

import { api } from '../api';

export default function DetailModal({ heritageId, onClose, onAddReview }) {
  const [heritage, setHeritage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'reviews'
  const [thoughtInput, setThoughtInput] = useState('');
  const [savedThoughts, setSavedThoughts] = useState([]);
  
  // Review form states
  const [reviewNickname, setReviewNickname] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchHeritageDetails();
    loadSavedThoughts();
  }, [heritageId]);

  const fetchHeritageDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getHeritageDetail(heritageId);
      setHeritage(data);
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedThoughts = () => {
    const key = `thoughts_${heritageId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setSavedThoughts(JSON.parse(stored));
    } else {
      setSavedThoughts([]);
    }
  };

  const handleSaveThought = (e) => {
    e.preventDefault();
    if (!thoughtInput.trim()) return;
    
    const newThought = {
      id: Date.now(),
      text: thoughtInput.trim(),
      date: new Date().toLocaleDateString()
    };
    
    const updated = [newThought, ...savedThoughts];
    localStorage.setItem(`thoughts_${heritageId}`, JSON.stringify(updated));
    setSavedThoughts(updated);
    setThoughtInput('');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewNickname.trim() || !reviewContent.trim()) return;
    
    setSubmittingReview(true);
    try {
      await api.addReview(heritageId, reviewNickname.trim(), reviewContent.trim());
      setReviewContent('');
      // Refresh details to load new review
      fetchHeritageDetails();
      if (onAddReview) onAddReview();
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="glass modal-content" style={{ padding: '40px', textAlign: 'center', width: '400px' }}>
          <div className="loader" style={{ marginBottom: '16px', color: '#10b981' }}>불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!heritage) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Hero image and title */}
        <div className="modal-hero">
          <img 
            src={`/images/${heritage.h_id}.webp`} 
            alt={heritage.name} 
            className="modal-hero-img"
            onError={(e) => {
              e.target.src = 'https://placehold.co/400x300/1e293b/fff?text=No+Image'; // Fallback
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(10,12,16,1), rgba(10,12,16,0))',
            padding: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end'
          }}>
            <div>
              <h2 className="modal-title" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
                {heritage.name}
              </h2>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={16} /> {heritage.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={16} /> {heritage.era}
                </span>
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 32px' }}>
          <button 
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            style={{ padding: '16px 24px', background: 'none', border: 'none', color: activeTab === 'info' ? '#fff' : 'var(--text-secondary)', borderBottom: activeTab === 'info' ? '2px solid var(--accent-color)' : 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            소개 & 성찰
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
            style={{ padding: '16px 24px', background: 'none', border: 'none', color: activeTab === 'reviews' ? '#fff' : 'var(--text-secondary)', borderBottom: activeTab === 'reviews' ? '2px solid var(--accent-color)' : 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            시민 후기 ({heritage.reviews ? heritage.reviews.length : 0})
          </button>
        </div>

        {/* Body content */}
        <div className="modal-body">
          {activeTab === 'info' ? (
            <div>
              {/* Description */}
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px', whiteSpace: 'pre-line' }}>
                {heritage.description}
              </p>

              {/* Reflection Card */}
              {heritage.reflection && (
                <div className="reflection-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent-color)', fontWeight: 700 }}>
                    <BookOpen size={20} />
                    <span>생각할 거리 (AI 큐레이션)</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.6 }}>
                    "{heritage.reflection}"
                  </p>
                  
                  {/* Thought logging form */}
                  <form onSubmit={handleSaveThought} style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" 
                      placeholder="이 질문에 대한 나만의 생각을 기록해 보세요..." 
                      value={thoughtInput}
                      onChange={(e) => setThoughtInput(e.target.value)}
                      style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none' }}
                    />
                    <button type="submit" className="btn-card-action" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Send size={16} /> 기록
                    </button>
                  </form>

                  {/* Saved thoughts log */}
                  {savedThoughts.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>나의 성찰 로그</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                        {savedThoughts.map(t => (
                          <div key={t.id} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{t.text}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Review Input form */}
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>후기 남기기</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="닉네임"
                    value={reviewNickname}
                    onChange={(e) => setReviewNickname(e.target.value)}
                    style={{ width: '150px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="답사 후기 내용을 작성해 주세요."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                    required
                  />
                  <button type="submit" disabled={submittingReview} className="btn-card-action" style={{ padding: '10px 20px' }}>
                    {submittingReview ? '제출중...' : '등록'}
                  </button>
                </div>
              </form>

              {/* Reviews list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {heritage.reviews && heritage.reviews.length > 0 ? (
                  heritage.reviews.map(r => (
                    <div key={r.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{r.user_id}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.created_at}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{r.content}</p>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    <MessageSquare size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
                    <p>아직 작성된 후기가 없습니다. 첫 후기를 작성해 보세요!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
