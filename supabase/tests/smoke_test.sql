-- Smoke test for supabase/schema.sql. Run against a THROWAWAY database only:
--   psql -d <test_db> -f supabase/schema.sql -f supabase/tests/smoke_test.sql
\set ON_ERROR_STOP 1
set role anon;

-- direct table access must be blocked
do $$ begin
    begin perform * from public.users; raise exception 'FAIL: anon can read users';
    exception when insufficient_privilege then raise notice 'ok: users table locked'; end;
end $$;

-- private helpers must be blocked
do $$ begin
    begin perform jct_private.owner_id(); raise exception 'FAIL: anon can call private fn';
    exception when insufficient_privilege then raise notice 'ok: private schema locked'; end;
end $$;

-- validation
do $$ begin
    begin perform public.jct_register('short', 'Abcdefg1!', 'SG'); raise exception 'FAIL: short name accepted';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;
    begin perform public.jct_register('GoodName1', 'weakpass', 'SG'); raise exception 'FAIL: weak password accepted';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;
end $$;

do $$
declare
    a jsonb; b jsonb; g jsonb; r jsonb; ta text; tb text; tg text; q jsonb; f jsonb;
begin
    a := public.jct_register('AliceTest1', 'Passw0rd!', 'Singapore');
    b := public.jct_register('BobbyTest2', 'Passw0rd!', 'Malaysia');
    ta := a->>'token'; tb := b->>'token';
    begin perform public.jct_register('aliceTEST1', 'Passw0rd!', 'SG'); raise exception 'FAIL: dup';
    exception when raise_exception then raise notice 'ok: dup blocked: %', sqlerrm; end;

    r := public.jct_login('AliceTest1', 'Passw0rd!');
    assert r->>'username' = 'AliceTest1', 'login failed';
    begin perform public.jct_login('AliceTest1', 'WrongPass1!'); raise exception 'FAIL: bad password';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;

    -- time sync: first sync capped at 30s
    r := public.jct_sync_time(ta, 500);
    assert (r->>'total_time')::int = 30, 'first sync should cap at 30, got ' || (r->>'total_time');
    assert (r->>'daily_streak')::int = 1, 'streak should be 1';
    raise notice 'ok: sync %', r->>'total_time';

    -- quests
    q := public.jct_get_quests(ta, 'daily');
    assert jsonb_array_length(q->'assigned_quests') = 4, 'daily quests should be 4';
    q := public.jct_get_quests(ta, 'monthly');
    assert jsonb_array_length(q->'assigned_quests') = 8, 'monthly quests should be 8';

    -- friends
    perform public.jct_send_friend_request(ta, 'BobbyTest2');
    f := public.jct_friend_requests(tb);
    assert f->0->>'sender_username' = 'AliceTest1', 'request not received';
    perform public.jct_respond_friend_request(tb, 'AliceTest1', 'accept');
    f := public.jct_friends(ta);
    assert f->0->>'username' = 'BobbyTest2', 'friend list wrong';
    perform public.jct_send_message(ta, 'BobbyTest2', 'Peace be with you', null);
    f := public.jct_chat_history(tb, 'AliceTest1');
    assert f->'messages'->0->>'message' = 'Peace be with you', 'chat failed';
    raise notice 'ok: friends + chat';

    -- quiz
    r := public.jct_submit_quiz(ta, 'pass', 'daily', 10, 95);
    assert (r->>'isNewRecord')::boolean, 'quiz record';
    begin perform public.jct_submit_quiz(ta, 'pass', 'daily', 10, 90); raise exception 'FAIL: daily twice';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;
    perform public.jct_submit_quiz(ta, 'pass', 'easy', 15, 60);
    r := public.jct_quiz_leaderboard('daily', ta);
    assert r->'userRecord'->>'username' = 'AliceTest1', 'quiz lb';
    r := public.jct_sync_time(ta, 0);
    assert (r->>'holypower')::int >= 1200, 'quiz HP not awarded: ' || (r->>'holypower');
    raise notice 'ok: quiz, hp=% xp=% quests_done=%', r->>'holypower', r->>'xp', r->>'quests_done';

    -- forum
    g := public.jct_guest_login('Narnia');
    tg := g->>'token';
    perform public.jct_add_post(ta, 'topics', '<b>Is grace free?</b>', null);
    f := public.jct_forum(ta);
    perform public.jct_add_post(tg, 'responses', 'Yes — Ephesians 2:8', f->'topics'->0->>'id');
    f := public.jct_forum(ta);
    assert f->'topics'->0->'responses'->0->>'author_type' = 'guest', 'guest response';
    perform public.jct_add_post(tb, 'comments', 'Amen', f->'topics'->0->'responses'->0->>'id');
    r := public.jct_react(tb, 'topics', f->'topics'->0->>'id', 'favorite');
    assert (r->>'count')::int = 1 and (r->>'active')::boolean, 'react on';
    r := public.jct_react(tb, 'topics', f->'topics'->0->>'id', 'favorite');
    assert (r->>'count')::int = 0, 'react off';
    begin perform public.jct_edit_post(tb, 'topics', f->'topics'->0->>'id', 'hacked'); raise exception 'FAIL: edit others';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;
    perform public.jct_edit_post(ta, 'topics', f->'topics'->0->>'id', 'Is grace truly free?');
    perform public.jct_add_post(tb, 'testimonies', 'He healed me', null);
    perform public.jct_delete_post(ta, 'topics', f->'topics'->0->>'id');
    f := public.jct_forum(null);
    assert jsonb_array_length(f->'topics') = 0 and jsonb_array_length(f->'testimonies') = 1, 'delete topic';
    raise notice 'ok: forum';

    -- guest restrictions
    begin perform public.jct_get_quests(tg, 'daily'); raise exception 'FAIL: guest quests';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;
    r := public.jct_sync_time(tg, 10);
    assert (r->>'is_guest')::boolean, 'guest sync';

    -- presence
    perform public.jct_ping(ta);
    r := public.jct_live_users();
    assert jsonb_array_length(r->'users') = 1, 'presence';

    -- bot
    r := public.jct_bot_create_session(ta, 'How do I pray?');
    perform public.jct_bot_add_message(ta, r->>'id', 'user', 'How do I pray?');
    perform public.jct_bot_add_message(ta, r->>'id', 'bot', 'Matthew 6:9');
    assert jsonb_array_length(public.jct_bot_messages(ta, r->>'id')) = 2, 'bot messages';
    begin perform public.jct_bot_messages(tb, r->>'id'); raise exception 'FAIL: read others bot chat';
    exception when raise_exception then raise notice 'ok: %', sqlerrm; end;
    perform public.jct_bot_update_session(ta, r->>'id', 'Prayer', true);
    assert (public.jct_bot_sessions(ta)->0->>'is_favorite')::boolean, 'bot fav';
    perform public.jct_bot_delete_session(ta, r->>'id');

    -- avatar + rename
    perform public.jct_save_avatar(ta, 'static/image/avatar3.jpg', 'shape-star', 'color-ruby', 'effect-fire');
    perform public.jct_change_username(ta, 'AliceRenamed9');
    r := public.jct_whoami(ta);
    assert r->>'username' = 'AliceRenamed9', 'rename session';
    f := public.jct_friends(tb);
    assert f->0->>'username' = 'AliceRenamed9', 'rename friends';
    r := public.jct_user_profile('AliceRenamed9');
    assert r->>'avatar_frame' = 'shape-star', 'avatar saved';

    -- leaderboard
    r := public.jct_leaderboard('holypower', 'all_time');
    assert r->'users'->0->>'username' = 'AliceRenamed9', 'leaderboard order';
    assert r->'timers'->>'daily_reset' is not null, 'timers';
    r := public.jct_site_stats();
    raise notice 'ok: stats %', r;

    perform public.jct_logout(ta);
    assert public.jct_whoami(ta) is null, 'logout';
    raise notice 'ALL SMOKE TESTS PASSED';
end $$;
