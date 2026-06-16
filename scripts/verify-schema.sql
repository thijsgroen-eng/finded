-- Schema smoke test: inserts into every table using the exact column sets the
-- application writes, proving the migrations (001 + 002 + 003) accept real app
-- writes, including the array columns and both onConflict upserts. Non-destructive
-- (wrapped in a transaction that rolls back).
--
-- Run against a database that already has all three migrations applied:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-schema.sql
--
-- Expected final row: result = 'ALL INSERTS OK', snapshot_rows = 1, lead_status = 'replied'.

begin;

insert into restaurants(name,website,city,country,cuisine,business_type,subtypes)
values ('De Kas','https://restaurantdekas.nl','Amsterdam','Netherlands','seafood','restaurant', array['seafood','fine dining'])
returning id as rid \gset
update restaurants set preview_slug = 'de-kas-'||left(:'rid',8) where id = :'rid';

insert into audits(restaurant_id,status) values (:'rid','running') returning id as aid \gset

insert into website_audits(audit_id,schema_present,menu_present,opening_hours_present,reservation_links_present,
  social_links_present,review_count,meta_title,meta_description,raw_html_snippet,
  schema_types,contact_present,location_present,review_signals,booking_present,faq_present,menu_or_services_present)
values (:'aid',true,true,true,true,true,123,'De Kas','Greenhouse restaurant','<html>',
  array['Restaurant','LocalBusiness'],true,true,true,true,false,true);

insert into prompt_runs(audit_id,prompt_id,category,intent,prompt_text)
values (:'aid','gen-1','discovery','find','Best restaurants in Amsterdam');

insert into model_runs(audit_id,model,prompt_id,prompt_text_id,raw_response,tokens_used,duration_ms)
values (:'aid','openai','gen-1','gen-1','1. De Kas ...',420,1200);

insert into entities(audit_id,model,prompt_id,name,type,position,context,sentiment,confidence)
values (:'aid','openai','gen-1','De Kas','restaurant',1,'top pick','positive',0.95)
returning id as eid \gset
insert into recommendation_reasons(entity_id,audit_id,reason) values (:'eid',:'aid','farm to table');

insert into mentions(audit_id,model,prompt_id,restaurant_name,mentioned,position,sentiment)
values (:'aid','openai','gen-1','De Kas',true,1,'positive');

insert into visibility_scores(audit_id,restaurant_id,visibility_score,opportunity_score,opportunity_label,
  mention_frequency,prompt_coverage,avg_position,median_position,best_position,worst_position,position_score,
  model_consensus,share_of_voice,total_market_mentions,sentiment_score,sentiment_positive,sentiment_neutral,
  sentiment_negative,visibility_gap,recommendation_gap,estimated_visitors_min,estimated_visitors_max,
  estimated_revenue_min,estimated_revenue_max,total_mentions,total_prompts,total_model_runs)
values (:'aid',:'rid',82,40,'MEDIUM',0.75,0.75,1.4,1,1,3,90,3,0.3,10,0.8,3,1,0,2,1,8,25,72,225,3,4,12);

insert into competitors(audit_id,name,mention_count,avg_position,sentiment_score,share_of_voice,top_reasons)
values (:'aid','Rijks',5,2.0,0.6,0.2, array['michelin','central']);

insert into score_history(restaurant_id,audit_id,visibility_score,opportunity_score,mention_frequency,model_consensus,total_mentions,snapshot_date)
values (:'rid',:'aid',82,40,0.75,3,3, now());

insert into recommendations(audit_id,restaurant_id,type,title,description,priority,impact,difficulty,status)
values (:'aid',:'rid','faq_page','Add FAQ','Add an FAQ page','high','+15%',null,'pending')
returning id as recid \gset
insert into generated_assets(restaurant_id,recommendation_id,audit_id,type,title,content,format,status,version)
values (:'rid',:'recid',:'aid','faq_page','FAQ','<html>','html','draft',1);

insert into lead_statuses(restaurant_id,status,notes,next_followup_at,last_contacted_at,updated_at)
values (:'rid','email_sent','first',now(),now(),now())
on conflict (restaurant_id) do update set status=excluded.status;
insert into lead_statuses(restaurant_id,status,notes,updated_at)
values (:'rid','replied','second',now())
on conflict (restaurant_id) do update set status=excluded.status, notes=excluded.notes;

insert into monitoring_schedules(restaurant_id,frequency,status,next_run_at,last_run_at)
values (:'rid','weekly','active',now(),now());

insert into signal_gaps(restaurant_id,gap_type,severity,title,explanation,evidence,benchmark,affected_intents,fix_available,fix_type,expected_impact)
values (:'rid','no_faq_content','medium','No FAQ','matters','none found','leaders have FAQ', array['occasion','discovery'],true,'faq_page','medium');

insert into signal_snapshots(restaurant_id,overall_score,recommendation_readiness,wikipedia_found,directory_coverage,
  review_platforms,total_external_reviews,reddit_found,gaps_critical,gaps_high,gaps_medium,snapshot_date)
values (:'rid',55,'moderate',false,60,3,120,true,0,1,2, current_date)
on conflict (restaurant_id,snapshot_date) do update set overall_score=excluded.overall_score;
insert into signal_snapshots(restaurant_id,overall_score,recommendation_readiness,wikipedia_found,directory_coverage,
  review_platforms,total_external_reviews,reddit_found,gaps_critical,gaps_high,gaps_medium,snapshot_date)
values (:'rid',70,'strong',true,80,4,200,true,0,0,1, current_date)
on conflict (restaurant_id,snapshot_date) do update set overall_score=excluded.overall_score, recommendation_readiness=excluded.recommendation_readiness;

insert into customers(restaurant_id,plan,status) values (:'rid','pro','active');

update audits set total_prompts=4, total_model_runs=12, recommendations='[{"title":"x"}]' where id=:'aid';

select 'ALL INSERTS OK' as result,
  (select count(*) from signal_snapshots where restaurant_id=:'rid') as snapshot_rows,
  (select status from lead_statuses where restaurant_id=:'rid') as lead_status;

rollback;
