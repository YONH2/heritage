import React, { useState } from 'react';
import { Landmark, Compass, FolderHeart, Landmark as DashboardIcon, HelpCircle, ChevronRight } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import CourseMaker from './pages/CourseMaker';
import MyCuration from './pages/MyCuration';
import DetailModal from './components/DetailModal';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' | 'search' | 'coursemaker' | 'mycuration'
  const [activeHeritageId, setActiveHeritageId] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [isCitizenView, setIsCitizenView] = useState(false);
  const [curationSubTab, setCurationSubTab] = useState('courses');

  // Toggle adding a heritage to the custom course list
  const handleToggleCourse = (id) => {
    setSelectedCourseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearCourse = () => {
    setSelectedCourseIds([]);
  };

  const handleSidebarCurationClick = (subTab) => {
    setCurrentPage('mycuration');
    setCurationSubTab(subTab);
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onViewDetails={setActiveHeritageId} />;
      case 'search':
        return (
          <Search 
            onViewDetails={setActiveHeritageId}
            selectedCourseIds={selectedCourseIds}
            onToggleCourse={handleToggleCourse}
            isCitizenView={isCitizenView}
            setIsCitizenView={setIsCitizenView}
          />
        );
      case 'coursemaker':
        return (
          <CourseMaker 
            selectedCourseIds={selectedCourseIds}
            onToggleCourse={handleToggleCourse}
            clearCourse={handleClearCourse}
          />
        );
      case 'mycuration':
        return <MyCuration activeTabCuration={curationSubTab} />;
      default:
        return <Dashboard onViewDetails={setActiveHeritageId} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Landmark size={24} style={{ color: '#10b981' }} />
          <h2 className="sidebar-logo-text">세종 AI 헤리티지</h2>
        </div>

        <ul className="sidebar-menu">
          <li>
            <a 
              className={`sidebar-menu-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              <DashboardIcon /> 대시보드 홈
            </a>
          </li>
          <li>
            <a 
              className={`sidebar-menu-item ${currentPage === 'search' && !isCitizenView ? 'active' : ''}`}
              onClick={() => { setCurrentPage('search'); setIsCitizenView(false); }}
            >
              <Compass /> 문화유산 검색
            </a>
          </li>
          <li>
            <a 
              className={`sidebar-menu-item ${currentPage === 'coursemaker' ? 'active' : ''}`}
              onClick={() => setCurrentPage('coursemaker')}
            >
              <Landmark /> AI 코스 만들기
              {selectedCourseIds.length > 0 && (
                <span style={{ 
                  backgroundColor: '#10b981', 
                  color: '#fff', 
                  fontSize: '0.75rem', 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  marginLeft: 'auto',
                  fontWeight: 'bold'
                }}>
                  {selectedCourseIds.length}
                </span>
              )}
            </a>
          </li>
          <li>
            <a 
              className={`sidebar-menu-item ${currentPage === 'mycuration' ? 'active' : ''}`}
              onClick={() => handleSidebarCurationClick('courses')}
            >
              <FolderHeart /> 나만의 문화유산 목록
            </a>
            
            {/* Sidebar quick toggles */}
            <div className="sidebar-toggle-group">
              <button 
                className="sidebar-toggle-btn"
                onClick={() => handleSidebarCurationClick('courses')}
                style={{
                  backgroundColor: currentPage === 'mycuration' && curationSubTab === 'courses' ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: currentPage === 'mycuration' && curationSubTab === 'courses' ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-color)'
                }}
              >
                <span>내 코스</span>
                <ChevronRight size={12} />
              </button>
              <button 
                className="sidebar-toggle-btn"
                onClick={() => handleSidebarCurationClick('suggestions')}
                style={{
                  backgroundColor: currentPage === 'mycuration' && curationSubTab === 'suggestions' ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: currentPage === 'mycuration' && curationSubTab === 'suggestions' ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-color)'
                }}
              >
                <span>내가 추천한 유산</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </li>
        </ul>

        {/* User Session Widget */}
        <div className="sidebar-user">
          <div className="user-avatar">시민</div>
          <div className="user-info">
            <span className="user-name">홍길동 님</span>
            <span className="user-role">일반 시민 회원</span>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        
        {/* Header */}
        <header className="header glass">
          <div className="header-title-container">
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              세종특별자치시 문화유산 AI 큐레이터 서비스 v1.0
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              오늘 일자: {new Date().toLocaleDateString('ko-KR')}
            </span>
          </div>
        </header>

        {/* Dynamic Page Render */}
        {renderActivePage()}
        
      </main>

      {/* Detail Modal Overlay */}
      {activeHeritageId && (
        <DetailModal 
          heritageId={activeHeritageId}
          onClose={() => setActiveHeritageId(null)}
        />
      )}

    </div>
  );
}
