import assert from 'node:assert/strict';
import fengari from 'fengari';
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;
/** Run the real Redis quota Lua in a Lua VM; only Redis commands/time are simulated. No external store. */
export function createQuotaTestRedis(now: () => number) {
  const values = new Map<string, { value: string; expires?: number }>();
  let calls = 0;
  const get = (key: string) => {
    const entry = values.get(key);
    if (entry?.expires && entry.expires <= now()) { values.delete(key); return undefined; }
    return entry;
  };
  const send: typeof fetch = async (_url, init) => {
    calls++;
    const [command, source, count, ...rest] = JSON.parse(String(init?.body));
    assert.equal(command, 'EVAL');
    const keys = rest.slice(0, Number(count));
    const args = rest.slice(Number(count)).map(String);
    const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
    try {
      for (const [name, entries] of [['KEYS', keys], ['ARGV', args]] as const) {
        lua.lua_newtable(L);
        entries.forEach((entry, i) => { lua.lua_pushstring(L, to_luastring(entry)); lua.lua_rawseti(L, -2, i + 1); });
        lua.lua_setglobal(L, to_luastring(name));
      }
      lua.lua_newtable(L);
      lua.lua_pushjsfunction(L, state => {
        const parts: string[] = [];
        for (let i = 1; i <= lua.lua_gettop(state); i++) parts.push(to_jsstring(lua.lua_tostring(state, i)));
        const [op, key, ...params] = parts;
        const current = get(key);
        let result: string | number | null = null;
        if (op === 'GET') result = current?.value ?? null;
        else if (op === 'TTL') result = current ? current.expires ? Math.ceil((current.expires - now()) / 1000) : -1 : -2;
        else if (op === 'INCR') { result = Number(current?.value || 0) + 1; values.set(key, { value: String(result), expires: current?.expires }); }
        else if (op === 'EXPIRE') { if (current) current.expires = now() + Number(params[0]) * 1000; result = current ? 1 : 0; }
        else if (op === 'SET') { values.set(key, { value: params[0], expires: now() + Number(params[2]) * 1000 }); result = 'OK'; }
        else if (op === 'DEL') { result = values.delete(key) ? 1 : 0; }
        else throw new Error('Unexpected Redis command ' + op);
        if (result === null) lua.lua_pushboolean(state, false);
        else if (typeof result === 'number') lua.lua_pushinteger(state, result);
        else lua.lua_pushstring(state, to_luastring(result));
        return 1;
      });
      lua.lua_setfield(L, -2, to_luastring('call')); lua.lua_setglobal(L, to_luastring('redis'));
      const status = lauxlib.luaL_dostring(L, to_luastring(source));
      assert.equal(status, lua.LUA_OK, status === lua.LUA_OK ? '' : to_jsstring(lua.lua_tostring(L, -1)));
      let result: unknown;
      if (lua.lua_istable(L, -1)) {
        const array: unknown[] = [];
        for (let i = 1; i <= lua.lua_rawlen(L, -1); i++) {
          lua.lua_rawgeti(L, -1, i);
          array.push(lua.lua_isnumber(L, -1) ? lua.lua_tonumber(L, -1) : to_jsstring(lua.lua_tostring(L, -1)));
          lua.lua_pop(L, 1);
        }
        result = array;
      } else result = lua.lua_tonumber(L, -1);
      return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } finally { lua.lua_close(L); }
  };
  return { send, values, get calls() { return calls; } };
}
