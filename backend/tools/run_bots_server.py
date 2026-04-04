import asyncio, json, random, logging, sys
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("bot")

PREMIUM = {"AA","KK","QQ","JJ","AKs","AKo"}
STRONG = {"TT","99","AQs","AQo","AJs","KQs"}

def hand_key(cards):
    if len(cards)<2: return ""
    r1,s1=cards[0][0],cards[0][1]; r2,s2=cards[1][0],cards[1][1]
    order="23456789TJQKA"
    i1=order.index(r1) if r1 in order else 0; i2=order.index(r2) if r2 in order else 0
    if i1<i2: r1,r2=r2,r1; s1,s2=s2,s1
    if r1==r2: return f"{r1}{r2}"
    suited = "s" if s1==s2 else "o"
    return f"{r1}{r2}{suited}"

async def bot(name, token, table):
    url = f"wss://pokerin.space/ws/table/{table}?token={token}"
    cards = []
    seated = False
    seats = []

    async def try_sit(ws):
        nonlocal seated
        empty = [i for i,s in enumerate(seats) if s.get("user_id") is None]
        if empty:
            s = random.choice(empty)
            log.info("[%s] Trying seat %d", name, s)
            await ws.send(json.dumps({"type":"sit","seat":s,"buyin":1000000000}))

    while True:
        try:
            async with websockets.connect(url) as ws:
                log.info("[%s] Connected", name)
                seated = False
                async for raw in ws:
                    msg = json.loads(raw)
                    t = msg.get("type")

                    if t == "table_state":
                        seats = msg.get("seats",[])
                        cards = msg.get("your_cards") or []
                        seated = any(s.get("name")==name and s.get("user_id") is not None for s in seats)
                        if not seated:
                            await try_sit(ws)

                    elif t == "seat_update":
                        idx = msg.get("seat", -1)
                        if 0 <= idx < len(seats):
                            seats[idx] = msg
                        seated = any(s.get("name")==name and s.get("user_id") is not None for s in seats)
                        if not seated:
                            await asyncio.sleep(random.uniform(0.3, 1.0))
                            await try_sit(ws)

                    elif t == "deal":
                        cards = msg.get("cards",[])

                    elif t == "hand_start":
                        cards = []
                        log.info("[%s] Hand #%d", name, msg.get("hand_num",0))

                    elif t == "action_prompt":
                        await asyncio.sleep(random.uniform(0.8, 2.0))
                        v = msg.get("valid",[])
                        mr = msg.get("min_raise",0)
                        mx = msg.get("max_raise",0)
                        key = hand_key(cards)

                        if key in PREMIUM and ("raise" in v or "bet" in v):
                            a = "bet" if "bet" in v else "raise"
                            await ws.send(json.dumps({"type":"action","action":a,"amount":min(mr*3,mx)}))
                        elif key in STRONG:
                            if "call" in v:
                                await ws.send(json.dumps({"type":"action","action":"call"}))
                            elif "check" in v:
                                await ws.send(json.dumps({"type":"action","action":"check"}))
                            else:
                                await ws.send(json.dumps({"type":"action","action":"fold"}))
                        elif "check" in v:
                            if random.random() < 0.15 and ("bet" in v or "raise" in v):
                                a = "bet" if "bet" in v else "raise"
                                await ws.send(json.dumps({"type":"action","action":a,"amount":mr}))
                            else:
                                await ws.send(json.dumps({"type":"action","action":"check"}))
                        elif "call" in v and random.random() < 0.3:
                            await ws.send(json.dumps({"type":"action","action":"call"}))
                        else:
                            await ws.send(json.dumps({"type":"action","action":"fold"}))

                    elif t == "error":
                        err = msg.get("message","")
                        log.warning("[%s] Error: %s", name, err)
                        if "occupied" in err.lower() or "seat" in err.lower():
                            await asyncio.sleep(random.uniform(0.5, 1.5))
                            await try_sit(ws)

        except websockets.ConnectionClosed as e:
            if e.code == 4002:
                log.info("[%s] Replaced, quick reconnect", name)
                await asyncio.sleep(random.uniform(1, 3))
                continue
            log.info("[%s] Closed: %s", name, e.code)
        except Exception as e:
            log.warning("[%s] Error: %s", name, e)
        log.info("[%s] Reconnecting in 3s", name)
        await asyncio.sleep(3)

async def main():
    with open("/tmp/bot_tokens.json") as f:
        bots = json.load(f)
    table = sys.argv[1] if len(sys.argv)>1 else "micro-1"
    n = int(sys.argv[2]) if len(sys.argv)>2 else len(bots)
    bots = bots[:n]
    log.info("Starting %d bots on %s", n, table)
    tasks = []
    for i,b in enumerate(bots):
        tasks.append(asyncio.create_task(bot(b["name"], b["token"], table)))
        await asyncio.sleep(1.5)
    await asyncio.gather(*tasks)

asyncio.run(main())
