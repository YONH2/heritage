const API_BASE = 'http://localhost:8000';

const isGas = typeof google !== 'undefined' && google.script && google.script.run;

function runGas(functionName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((result) => resolve(result))
      .withFailureHandler((error) => {
        console.error(`GAS execution error for ${functionName}:`, error);
        reject(error);
      })
      [functionName](...args);
  });
}

export const api = {
  getStats: async () => {
    if (isGas) {
      return runGas('getStats');
    }
    const resp = await fetch(`${API_BASE}/api/stats`);
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },
  
  getHeritageList: async (district = '', era = '', query = '') => {
    if (isGas) {
      return runGas('getHeritageList', district || null, era || null, query || null);
    }
    let url = `${API_BASE}/api/heritage?`;
    const params = [];
    if (district) params.push(`district=${encodeURIComponent(district)}`);
    if (era) params.push(`era=${encodeURIComponent(era)}`);
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    url += params.join('&');
    
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  getHeritageDetail: async (heritageId) => {
    if (isGas) {
      return runGas('getHeritageDetail', heritageId);
    }
    const resp = await fetch(`${API_BASE}/api/heritage/${heritageId}`);
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  aiSearch: async (query) => {
    if (isGas) {
      return runGas('aiSearch', query);
    }
    const resp = await fetch(`${API_BASE}/api/search/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  getCandidates: async () => {
    if (isGas) {
      return runGas('getCandidates');
    }
    const resp = await fetch(`${API_BASE}/api/candidates`);
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  submitCandidate: async (data) => {
    if (isGas) {
      return runGas(
        'submitCandidate',
        data.name,
        data.photo_url || '',
        data.gps_lat,
        data.gps_lng,
        data.reason,
        data.submitted_by
      );
    }
    const resp = await fetch(`${API_BASE}/api/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  recommendCandidate: async (id) => {
    if (isGas) {
      return runGas('recommendCandidate', id);
    }
    const resp = await fetch(`${API_BASE}/api/candidate/${id}/recommend`, {
      method: 'POST'
    });
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  approveCandidate: async (id, status, reviewedBy = '세종시청 문화예술과 담당자') => {
    if (isGas) {
      return runGas('approveCandidate', id, status, reviewedBy);
    }
    const resp = await fetch(`${API_BASE}/api/candidate/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewed_by: reviewedBy })
    });
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  getCourses: async (userId = 'sejong_citizen') => {
    if (isGas) {
      return runGas('getCourses', userId);
    }
    const resp = await fetch(`${API_BASE}/api/courses?user_id=${encodeURIComponent(userId)}`);
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  saveCourse: async (title, heritageIds, transportMode, estimatedTime, theme) => {
    if (isGas) {
      return runGas(
        'saveCourse',
        'sejong_citizen',
        title,
        heritageIds,
        transportMode,
        estimatedTime,
        theme
      );
    }
    const resp = await fetch(`${API_BASE}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'sejong_citizen',
        title,
        heritage_ids: heritageIds,
        transport_mode: transportMode,
        estimated_time: estimatedTime,
        theme
      })
    });
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  },

  addReview: async (heritageId, userId, content) => {
    if (isGas) {
      return runGas('addReview', heritageId, userId, content);
    }
    const resp = await fetch(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heritage_id: heritageId,
        user_id: userId,
        content,
        photo_url: ""
      })
    });
    if (!resp.ok) throw new Error('API error');
    return resp.json();
  }
};
