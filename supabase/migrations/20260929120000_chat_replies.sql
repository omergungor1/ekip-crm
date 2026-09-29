alter table public.chat_messages
  add column reply_to_id uuid references public.chat_messages (id) on delete set null;

create index chat_messages_reply_idx on public.chat_messages (reply_to_id);
