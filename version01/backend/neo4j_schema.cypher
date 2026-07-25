// ============================================================================
// Neo4j Cypher Schema & Query Scripts for Sejong Cultural Heritage Curation
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Constraints & Indexes (Run these first for data integrity and performance)
// ----------------------------------------------------------------------------
CREATE CONSTRAINT unique_heritage_id IF NOT EXISTS FOR (h:Heritage) REQUIRE h.h_id IS UNIQUE;
CREATE CONSTRAINT unique_district_name IF NOT EXISTS FOR (d:District) REQUIRE d.name IS UNIQUE;
CREATE CONSTRAINT unique_era_name IF NOT EXISTS FOR (e:Era) REQUIRE e.name IS UNIQUE;
CREATE CONSTRAINT unique_user_id IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE CONSTRAINT unique_course_id IF NOT EXISTS FOR (c:Course) REQUIRE c.course_id IS UNIQUE;
CREATE CONSTRAINT unique_candidate_id IF NOT EXISTS FOR (cand:Candidate) REQUIRE cand.candidate_id IS UNIQUE;

// ----------------------------------------------------------------------------
// 2. Seeding Metadata Nodes (Districts & Eras)
// ----------------------------------------------------------------------------
// Districts (세종특별자치시 행정구역)
UNWIND ['조치원읍', '연서면', '전의면', '전동면', '금남면', '부강면', '소정면', '장군면', '연기면', '연동면', '한솔동', '도담동', '아름동', '종촌동', '고운동', '보람동', '소담동', '대평동', '새롬동', '다정동', '해밀동', '반곡동', '나성동', '어진동', '세종동'] AS districtName
MERGE (:District {name: districtName});

// Eras (역사적 시대)
UNWIND ['선사시대', '청동기', '삼국', '통일신라', '고려', '조선', '조선 전기', '조선 중기', '조선 후기', '근대', '현대', '미상'] AS eraName
MERGE (:Era {name: eraName});

// ----------------------------------------------------------------------------
// 3. Creating/Merging Heritages and Relationships (Example Node)
// ----------------------------------------------------------------------------
MERGE (h:Heritage {h_id: 'H1'})
ON CREATE SET 
    h.name = '세종 임난수 은행나무',
    h.location = '세종특별자치시 어진동 산2',
    h.description = '고려 말의 충신 임난수 장군이 심은 은행나무입니다.',
    h.reflection = '한결같은 충심에 대해 생각해보세요.',
    h.gps_lat = 36.507,
    h.gps_lng = 127.260;

// Connect Heritage to District
WITH h
MATCH (d:District {name: '어진동'})
MERGE (h)-[:LOCATED_IN]->(d);

// Connect Heritage to Era
WITH h
MATCH (e:Era {name: '고려'})
MERGE (h)-[:BELONGS_TO_ERA]->(e);

// ----------------------------------------------------------------------------
// 4. User Interaction Queries (Reviews, Courses, Candidates)
// ----------------------------------------------------------------------------

// A. Create User and course, then link to Heritages (코스 생성 관계 모델링)
MERGE (u:User {user_id: 'user_123'})
MERGE (c:Course {course_id: 'course_999'})
ON CREATE SET 
    c.title = '어진동 역사 산책 코스',
    c.transport_mode = '도보',
    c.estimated_time = '1시간 30분',
    c.created_content = '어진동의 역사 유적지를 걸어서 탐방하는 추천 여행 코스입니다.';

// Establish user created course relationship
MERGE (u)-[:CREATED]->(c);

// Establish course sequence to heritages
WITH c
MATCH (h1:Heritage {h_id: 'H1'})
MATCH (h2:Heritage {h_id: 'H2'}) // Assuming H2 exists
MERGE (c)-[:CONTAINS_HERITAGE {order: 1}]->(h1)
MERGE (c)-[:CONTAINS_HERITAGE {order: 2}]->(h2);

// B. User Review Relationship
MATCH (u:User {user_id: 'user_123'})
MATCH (h:Heritage {h_id: 'H1'})
MERGE (u)-[r:WROTE_REVIEW]->(h)
ON CREATE SET 
    r.content = '은행나무가 정말 웅장하고 아름답습니다.',
    r.created_at = datetime();

// C. Citizen Curation Submission
MATCH (u:User {user_id: 'user_123'})
MERGE (cand:Candidate {candidate_id: 'cand_456'})
ON CREATE SET 
    cand.name = '세종 금호리 산신제 터',
    cand.gps_lat = 36.465,
    cand.gps_lng = 127.288,
    cand.reason = '마을 전통 신앙의 흔적이 남아있는 보존 가치가 있는 장소입니다.',
    cand.status = '신청중',
    cand.recommend_count = 1;
MERGE (u)-[:SUBMITTED]->(cand);

// ----------------------------------------------------------------------------
// 5. Advanced Graph Queries & Graph AI Recommendations
// ----------------------------------------------------------------------------

// Query 1: Recommendation by Geo-Historical Proximity (동일 지역 및 시대 유사 문화유산 추천)
// H1과 동일한 지역구에 있거나 동일한 시대에 속한 유적지 추천 (유사도 가중치 부여)
MATCH (target:Heritage {h_id: 'H1'})
MATCH (rec:Heritage) WHERE rec.h_id <> target.h_id
OPTIONAL MATCH (target)-[:LOCATED_IN]->(d:District)<-[:LOCATED_IN]-(rec)
OPTIONAL MATCH (target)-[:BELONGS_TO_ERA]->(e:Era)<-[:BELONGS_TO_ERA]-(rec)
WITH rec,
     CASE WHEN d IS NOT NULL THEN 2.0 ELSE 0.0 END AS districtWeight,
     CASE WHEN e IS NOT NULL THEN 1.0 ELSE 0.0 END AS eraWeight
WITH rec, (districtWeight + eraWeight) AS similarityScore
WHERE similarityScore > 0
RETURN rec.h_id AS id, rec.name AS name, rec.location AS location, similarityScore
ORDER BY similarityScore DESC
LIMIT 5;

// Query 2: Collaborative Course Curation (코스 동시 구성 추천)
// 'H1' 유산을 코스에 포함시킨 다른 유저들이 함께 추가한 가장 빈도가 높은 유적지 추천
MATCH (target:Heritage {h_id: 'H1'})<-[:CONTAINS_HERITAGE]-(c:Course)-[:CONTAINS_HERITAGE]->(rec:Heritage)
WHERE rec.h_id <> target.h_id
RETURN rec.h_id AS id, rec.name AS name, COUNT(c) AS co_occurrence
ORDER BY co_occurrence DESC
LIMIT 5;

// Query 3: User Activity Curation Path
// 특정 유저(user_123)가 생성한 코스와 작성한 리뷰를 토대로 선호하는 시대(Era) 비율 조회
MATCH (u:User {user_id: 'user_123'})
OPTIONAL MATCH (u)-[:CREATED]->(:Course)-[:CONTAINS_HERITAGE]->(h:Heritage)-[:BELONGS_TO_ERA]->(e:Era)
OPTIONAL MATCH (u)-[:WROTE_REVIEW]->(h2:Heritage)-[:BELONGS_TO_ERA]->(e2:Era)
WITH COLLECT(e.name) + COLLECT(e2.name) AS allEras
UNWIND allEras AS eraName
RETURN eraName, COUNT(eraName) AS preferenceCount
ORDER BY preferenceCount DESC;
