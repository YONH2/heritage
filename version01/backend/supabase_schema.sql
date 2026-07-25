-- 1. Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 2. Create heritage_master table
create table if not exists heritage_master (
    h_id text primary key,
    name text not null,
    location text,
    district text,
    description text,
    era text,
    reflection text,
    gps_lat double precision,
    gps_lng double precision,
    embedding vector(768) -- Support for Gemini 768-dimension embeddings
);

-- 3. Create citizen_heritage_candidate table
create table if not exists citizen_heritage_candidate (
    id bigint primary key generated always as identity,
    name text not null,
    photo_url text,
    gps_lat double precision,
    gps_lng double precision,
    reason text,
    submitted_by text,
    recommend_count integer default 0,
    status text default '신청중',
    reviewed_by text,
    reviewed_at timestamp with time zone
);

-- 4. Create user_course table
create table if not exists user_course (
    id bigint primary key generated always as identity,
    user_id text,
    title text not null,
    heritage_ids jsonb, -- Store list of heritage IDs as JSONB
    transport_mode text,
    estimated_time text,
    created_content text
);

-- 5. Create user_review table
create table if not exists user_review (
    id bigint primary key generated always as identity,
    heritage_id text,
    user_id text,
    photo_url text,
    content text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Create user_recommendation_log table
create table if not exists user_recommendation_log (
    id bigint primary key generated always as identity,
    user_id text,
    candidate_id bigint references citizen_heritage_candidate(id) on delete cascade,
    status_snapshot text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Create HNSW index for vector similarity search optimization (Cosine distance)
create index if not exists heritage_master_embedding_idx 
on heritage_master 
using hnsw (embedding vector_cosine_ops);

-- 8. Create RPC function for semantic vector search
create or replace function match_heritages (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  h_id text,
  name text,
  location text,
  district text,
  description text,
  era text,
  reflection text,
  gps_lat double precision,
  gps_lng double precision,
  similarity float
)
language sql stable
as $$
  select
    h_id,
    name,
    location,
    district,
    description,
    era,
    reflection,
    gps_lat,
    gps_lng,
    1 - (embedding <=> query_embedding) as similarity
  from heritage_master
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
