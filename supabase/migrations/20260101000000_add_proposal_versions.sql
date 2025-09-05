alter table proposals add column if not exists gen_prompt_version text;
alter table proposals add column if not exists gen_model_version text;
alter table proposals add column if not exists scry_prompt_version text;
alter table proposals add column if not exists scry_model_version text;
