-- ============================================================
-- Seed: Prompt templates
-- Run AFTER 001_initial_schema.sql
-- Replace {city} at runtime with actual city name
-- ============================================================

-- This seed inserts template prompts. At runtime the engine
-- replaces {city} with the restaurant's actual city.

insert into prompts (category, prompt, city) values

-- ITALIAN
('italian', 'Best Italian restaurant in {city}', '{city}'),
('italian', 'Where to eat authentic Italian food in {city}', '{city}'),
('italian', 'Top Italian restaurants {city} for dinner', '{city}'),

-- DATE NIGHT / ROMANTIC
('date_night', 'Best romantic restaurant in {city} for a date night', '{city}'),
('date_night', 'Where to take someone special for dinner in {city}', '{city}'),
('date_night', 'Best restaurants for a date in {city}', '{city}'),
('date_night', 'Romantic dinner {city} with good atmosphere', '{city}'),

-- FAMILY
('family', 'Best family-friendly restaurant in {city}', '{city}'),
('family', 'Where to eat with kids in {city}', '{city}'),
('family', 'Good family restaurants in {city}', '{city}'),

-- BUSINESS LUNCH
('business_lunch', 'Best restaurant for a business lunch in {city}', '{city}'),
('business_lunch', 'Professional lunch spots in {city}', '{city}'),
('business_lunch', 'Business lunch restaurant {city} good for clients', '{city}'),

-- FINE DINING
('fine_dining', 'Best fine dining restaurant in {city}', '{city}'),
('fine_dining', 'Michelin star or fine dining in {city}', '{city}'),
('fine_dining', 'Most upscale restaurant in {city} for a special occasion', '{city}'),

-- LOCAL DISCOVERY
('local_discovery', 'Best local restaurants in {city} recommended by locals', '{city}'),
('local_discovery', 'Hidden gem restaurants in {city}', '{city}'),
('local_discovery', 'Most popular restaurants among locals in {city}', '{city}'),

-- TOURIST DISCOVERY
('tourist_discovery', 'Where should tourists eat in {city}', '{city}'),
('tourist_discovery', 'Best restaurants to visit as a tourist in {city}', '{city}'),
('tourist_discovery', 'Must-try restaurants in {city} for first-time visitors', '{city}');
