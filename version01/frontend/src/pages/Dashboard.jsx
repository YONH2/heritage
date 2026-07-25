import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Landmark, Compass, Award, CheckCircle, Calendar, MapPin } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

import { api } from '../api';

export default function Dashboard({ onViewDetails }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [featuredHeritages, setFeaturedHeritages] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchFeatured();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchFeatured = async () => {
    try {
      const data = await api.getHeritageList();
      // Just take the first 3 heritages (e.g., H1, H2, H3) as featured ones
      setFeaturedHeritages(data.slice(0, 3));
    } catch (err) {
      console.error("Error fetching featured heritages:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--accent-color)' }}>
        불러오는 중...
      </div>
    );
  }

  // Chart 1: District Statistics
  const districtLabels = stats.district_stats.map(s => s.district);
  const districtValues = stats.district_stats.map(s => s.count);
  const districtChartData = {
    labels: districtLabels,
    datasets: [{
      label: '문화유산 수',
      data: districtValues,
      backgroundColor: 'rgba(16, 185, 129, 0.6)',
      borderColor: 'rgba(16, 185, 129, 1)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  // Chart 2: Era Statistics
  const eraLabels = stats.era_stats.map(s => s.era);
  const eraValues = stats.era_stats.map(s => s.count);
  const eraChartData = {
    labels: eraLabels,
    datasets: [{
      label: '문화유산 수',
      data: eraValues,
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  // Chart 3: Doughnut Chart
  const doughnutData = {
    labels: ['지정 문화유산', '자문 검토 후보'],
    datasets: [{
      data: [stats.total_count, 0], // In MVP candidates start empty
      backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(255, 255, 255, 0.05)'],
      borderColor: ['rgba(16, 185, 129, 1)', 'rgba(255, 255, 255, 0.1)'],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#131722',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="page-view">
      
      {/* Title */}
      <div className="page-title-section">
        <h1 className="page-title">세종 문화유산 요약 대시보드</h1>
        <p className="page-subtitle">세종특별자치시 내 총 119건의 소중한 문화유산을 한 눈에 확인하세요.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid-stats">
        <div className="glass card-stat">
          <div className="stat-icon">
            <Landmark />
          </div>
          <div className="stat-details">
            <span className="stat-value">{stats.total_count}건</span>
            <span className="stat-label">총 국가등록 문화유산</span>
          </div>
        </div>

        <div className="glass card-stat">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <Award />
          </div>
          <div className="stat-details">
            <span className="stat-value">{stats.district_stats.length}개</span>
            <span className="stat-label">문화유산 분포 지역(읍면동)</span>
          </div>
        </div>

        <div className="glass card-stat">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
            <Compass />
          </div>
          <div className="stat-details">
            <span className="stat-value">3개 코스</span>
            <span className="stat-label">추천 역사 테마 답사 코스</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid-charts">
        <div className="glass card-chart">
          <h3 className="chart-header">읍·면·동별 문화유산 개수</h3>
          <div className="chart-container-inner">
            <Bar data={districtChartData} options={chartOptions} />
          </div>
        </div>

        <div className="glass card-chart">
          <h3 className="chart-header">시대별 문화유산 분포</h3>
          <div className="chart-container-inner">
            <Bar data={eraChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Featured Heritage Grid */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>이달의 추천 문화유산</h2>
        <div className="grid-heritages">
          {featuredHeritages.map(h => (
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
                <div className="heritage-card-footer">
                  <span style={{ color: 'var(--text-muted)' }}>코딩 식별자: {h.h_id}</span>
                  <button className="btn-card-action" onClick={() => onViewDetails(h.h_id)}>
                    자세히 보기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
