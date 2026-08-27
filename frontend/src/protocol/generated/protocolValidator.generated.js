/** Generated standalone JSON-Schema validators. Source SHA-256: 9643d2d99e9b6fc5075b6cdd1a8edfebb3fd8339388f5d2b987a1a0086fd9c34 */
import runtimeModule0 from "ajv-formats/dist/formats.js";
import runtimeModule1 from "ajv/dist/runtime/ucs2length.js";
"use strict";
export const validateServerMessage = validate20;
const schema31 = {"$defs":{"AckMessage":{"properties":{"command_id":{"maxLength":128,"minLength":1,"title":"Command Id","type":"string"},"command_type":{"enum":["sit","stand","action","add_chips","chat"],"title":"Command Type","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"status":{"const":"received","title":"Status","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"ack","default":"ack","title":"Type","type":"string"}},"required":["stream_id","command_id","command_type","status","schema_version","revision","server_time","type"],"title":"AckMessage","type":"object"},"ActionOnMessage":{"properties":{"prompt_id":{"maxLength":128,"minLength":1,"title":"Prompt Id","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"timeout":{"minimum":0,"title":"Timeout","type":"number"},"turn_token":{"maxLength":128,"minLength":1,"title":"Turn Token","type":"string"},"type":{"const":"action_on","default":"action_on","title":"Type","type":"string"}},"required":["stream_id","seat","timeout","prompt_id","turn_token","schema_version","revision","server_time","type"],"title":"ActionOnMessage","type":"object"},"ActionPromptMessage":{"properties":{"call_amount":{"minimum":0,"title":"Call Amount","type":"integer"},"max_raise":{"minimum":0,"title":"Max Raise","type":"integer"},"min_raise":{"minimum":0,"title":"Min Raise","type":"integer"},"prompt_id":{"maxLength":128,"minLength":1,"title":"Prompt Id","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"timeout":{"minimum":0,"title":"Timeout","type":"number"},"turn_token":{"maxLength":128,"minLength":1,"title":"Turn Token","type":"string"},"type":{"const":"action_prompt","default":"action_prompt","title":"Type","type":"string"},"valid":{"items":{"enum":["fold","check","call","bet","raise","allin"],"type":"string"},"title":"Valid","type":"array"}},"required":["stream_id","valid","call_amount","min_raise","max_raise","timeout","prompt_id","turn_token","schema_version","revision","server_time","type"],"title":"ActionPromptMessage","type":"object"},"BankTimeStartMessage":{"properties":{"duration":{"minimum":0,"title":"Duration","type":"number"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"bank_time_start","default":"bank_time_start","title":"Type","type":"string"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["stream_id","seat","user_id","duration","schema_version","revision","server_time","type"],"title":"BankTimeStartMessage","type":"object"},"BlindsData":{"additionalProperties":false,"properties":{"big":{"minimum":0,"title":"Big","type":"integer"},"small":{"minimum":0,"title":"Small","type":"integer"}},"required":["small","big"],"title":"BlindsData","type":"object"},"ChatMessage":{"properties":{"name":{"title":"Name","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"text":{"maxLength":200,"minLength":1,"title":"Text","type":"string"},"type":{"const":"chat","default":"chat","title":"Type","type":"string"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["stream_id","user_id","name","text","schema_version","revision","server_time","type"],"title":"ChatMessage","type":"object"},"CommunityMessage":{"properties":{"board":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Board","type":"array"},"cards":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Cards","type":"array"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"street":{"enum":["preflop","flop","turn","river","showdown"],"title":"Street","type":"string"},"type":{"const":"community","default":"community","title":"Type","type":"string"}},"required":["stream_id","street","cards","board","schema_version","revision","server_time","type"],"title":"CommunityMessage","type":"object"},"DealMessage":{"properties":{"cards":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Cards","type":"array"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"deal","default":"deal","title":"Type","type":"string"}},"required":["stream_id","cards","schema_version","revision","server_time","type"],"title":"DealMessage","type":"object"},"ErrorMessage":{"properties":{"code":{"maxLength":128,"minLength":1,"title":"Code","type":"string"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"details":{"anyOf":[{"additionalProperties":true,"type":"object"},{"type":"null"}],"default":null,"title":"Details"},"message":{"minLength":1,"title":"Message","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"error","default":"error","title":"Type","type":"string"}},"required":["stream_id","code","message","schema_version","revision","server_time","type"],"title":"ErrorMessage","type":"object"},"HandResultMessage":{"properties":{"community":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Community","type":"array"},"pots":{"items":{"$ref":"#/$defs/PotData"},"title":"Pots","type":"array"},"rake":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Rake"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_seed":{"title":"Server Seed","type":"string"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"shown_cards":{"additionalProperties":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"type":"array"},"title":"Shown Cards","type":"object"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"hand_result","default":"hand_result","title":"Type","type":"string"},"winners":{"items":{"$ref":"#/$defs/WinnerData"},"title":"Winners","type":"array"}},"required":["stream_id","community","winners","shown_cards","pots","server_seed","schema_version","revision","server_time","type"],"title":"HandResultMessage","type":"object"},"HandStartMessage":{"properties":{"dealer":{"title":"Dealer","type":"integer"},"hand_num":{"minimum":0,"title":"Hand Num","type":"integer"},"pot":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Pot"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seats":{"anyOf":[{"items":{"$ref":"#/$defs/SeatData"},"type":"array"},{"type":"null"}],"default":null,"title":"Seats"},"seed_hash":{"minLength":1,"title":"Seed Hash","type":"string"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"hand_start","default":"hand_start","title":"Type","type":"string"}},"required":["stream_id","hand_num","seed_hash","dealer","schema_version","revision","server_time","type"],"title":"HandStartMessage","type":"object"},"PlayerActionMessage":{"properties":{"action":{"enum":["fold","check","call","bet","raise","allin"],"title":"Action","type":"string"},"action_on":{"anyOf":[{"type":"integer"},{"type":"null"}],"default":null,"title":"Action On"},"amount":{"minimum":0,"title":"Amount","type":"integer"},"current_bet":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Current Bet"},"pot":{"minimum":0,"title":"Pot","type":"integer"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stack":{"minimum":0,"title":"Stack","type":"integer"},"status":{"anyOf":[{"enum":["waiting","active","folded","allin","sitting_out"],"type":"string"},{"type":"null"}],"default":null,"title":"Status"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"player_action","default":"player_action","title":"Type","type":"string"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["stream_id","seat","user_id","action","amount","stack","pot","schema_version","revision","server_time","type"],"title":"PlayerActionMessage","type":"object"},"PotData":{"properties":{"amount":{"minimum":0,"title":"Amount","type":"integer"},"eligible":{"items":{"minimum":0,"type":"integer"},"title":"Eligible","type":"array"}},"required":["amount","eligible"],"title":"PotData","type":"object"},"SeatData":{"properties":{"current_bet":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Current Bet"},"name":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Name"},"portrait":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Portrait"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"stack":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Stack"},"status":{"enum":["empty","waiting","active","folded","allin","sitting_out"],"title":"Status","type":"string"},"user_id":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"User Id"}},"required":["seat","status"],"title":"SeatData","type":"object"},"SeatUpdateMessage":{"properties":{"current_bet":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Current Bet"},"name":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Name"},"portrait":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Portrait"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stack":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Stack"},"status":{"enum":["empty","waiting","active","folded","allin","sitting_out"],"title":"Status","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"seat_update","default":"seat_update","title":"Type","type":"string"},"user_id":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"User Id"}},"required":["seat","status","stream_id","schema_version","revision","server_time","type"],"title":"SeatUpdateMessage","type":"object"},"TableStateMessage":{"properties":{"action_on":{"title":"Action On","type":"integer"},"blinds":{"$ref":"#/$defs/BlindsData"},"community":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Community","type":"array"},"dealer":{"title":"Dealer","type":"integer"},"hand_num":{"minimum":0,"title":"Hand Num","type":"integer"},"phase":{"enum":["idle","posting","dealing","betting","showdown","complete"],"title":"Phase","type":"string"},"pots":{"items":{"$ref":"#/$defs/PotData"},"title":"Pots","type":"array"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seats":{"items":{"$ref":"#/$defs/SeatData"},"title":"Seats","type":"array"},"seed_hash":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Seed Hash"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"shown_cards":{"additionalProperties":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"type":"array"},"title":"Shown Cards","type":"object"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"street":{"enum":["preflop","flop","turn","river","showdown"],"title":"Street","type":"string"},"table_id":{"title":"Table Id","type":"string"},"table_name":{"title":"Table Name","type":"string"},"type":{"const":"table_state","default":"table_state","title":"Type","type":"string"},"winners":{"items":{"$ref":"#/$defs/WinnerData"},"title":"Winners","type":"array"},"your_cards":{"anyOf":[{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"type":"array"},{"type":"null"}],"default":null,"title":"Your Cards"}},"required":["stream_id","table_id","table_name","seats","community","pots","dealer","action_on","street","phase","hand_num","blinds","schema_version","revision","server_time","type"],"title":"TableStateMessage","type":"object"},"WinnerData":{"properties":{"amount":{"minimum":0,"title":"Amount","type":"integer"},"hand":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Hand"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["seat","user_id","amount"],"title":"WinnerData","type":"object"}},"oneOf":[{"$ref":"#/$defs/TableStateMessage"},{"$ref":"#/$defs/HandStartMessage"},{"$ref":"#/$defs/DealMessage"},{"$ref":"#/$defs/CommunityMessage"},{"$ref":"#/$defs/PlayerActionMessage"},{"$ref":"#/$defs/ActionOnMessage"},{"$ref":"#/$defs/ActionPromptMessage"},{"$ref":"#/$defs/HandResultMessage"},{"$ref":"#/$defs/SeatUpdateMessage"},{"$ref":"#/$defs/BankTimeStartMessage"},{"$ref":"#/$defs/ChatMessage"},{"$ref":"#/$defs/AckMessage"},{"$ref":"#/$defs/ErrorMessage"}],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://pokerin.space/schema/ws/server-v1"};
const schema39 = {"properties":{"cards":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Cards","type":"array"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"deal","default":"deal","title":"Type","type":"string"}},"required":["stream_id","cards","schema_version","revision","server_time","type"],"title":"DealMessage","type":"object"};
const schema40 = {"properties":{"board":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Board","type":"array"},"cards":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Cards","type":"array"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"street":{"enum":["preflop","flop","turn","river","showdown"],"title":"Street","type":"string"},"type":{"const":"community","default":"community","title":"Type","type":"string"}},"required":["stream_id","street","cards","board","schema_version","revision","server_time","type"],"title":"CommunityMessage","type":"object"};
const schema41 = {"properties":{"action":{"enum":["fold","check","call","bet","raise","allin"],"title":"Action","type":"string"},"action_on":{"anyOf":[{"type":"integer"},{"type":"null"}],"default":null,"title":"Action On"},"amount":{"minimum":0,"title":"Amount","type":"integer"},"current_bet":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Current Bet"},"pot":{"minimum":0,"title":"Pot","type":"integer"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stack":{"minimum":0,"title":"Stack","type":"integer"},"status":{"anyOf":[{"enum":["waiting","active","folded","allin","sitting_out"],"type":"string"},{"type":"null"}],"default":null,"title":"Status"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"player_action","default":"player_action","title":"Type","type":"string"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["stream_id","seat","user_id","action","amount","stack","pot","schema_version","revision","server_time","type"],"title":"PlayerActionMessage","type":"object"};
const schema42 = {"properties":{"prompt_id":{"maxLength":128,"minLength":1,"title":"Prompt Id","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"timeout":{"minimum":0,"title":"Timeout","type":"number"},"turn_token":{"maxLength":128,"minLength":1,"title":"Turn Token","type":"string"},"type":{"const":"action_on","default":"action_on","title":"Type","type":"string"}},"required":["stream_id","seat","timeout","prompt_id","turn_token","schema_version","revision","server_time","type"],"title":"ActionOnMessage","type":"object"};
const schema43 = {"properties":{"call_amount":{"minimum":0,"title":"Call Amount","type":"integer"},"max_raise":{"minimum":0,"title":"Max Raise","type":"integer"},"min_raise":{"minimum":0,"title":"Min Raise","type":"integer"},"prompt_id":{"maxLength":128,"minLength":1,"title":"Prompt Id","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"timeout":{"minimum":0,"title":"Timeout","type":"number"},"turn_token":{"maxLength":128,"minLength":1,"title":"Turn Token","type":"string"},"type":{"const":"action_prompt","default":"action_prompt","title":"Type","type":"string"},"valid":{"items":{"enum":["fold","check","call","bet","raise","allin"],"type":"string"},"title":"Valid","type":"array"}},"required":["stream_id","valid","call_amount","min_raise","max_raise","timeout","prompt_id","turn_token","schema_version","revision","server_time","type"],"title":"ActionPromptMessage","type":"object"};
const schema47 = {"properties":{"current_bet":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Current Bet"},"name":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Name"},"portrait":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Portrait"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stack":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Stack"},"status":{"enum":["empty","waiting","active","folded","allin","sitting_out"],"title":"Status","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"seat_update","default":"seat_update","title":"Type","type":"string"},"user_id":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"User Id"}},"required":["seat","status","stream_id","schema_version","revision","server_time","type"],"title":"SeatUpdateMessage","type":"object"};
const schema48 = {"properties":{"duration":{"minimum":0,"title":"Duration","type":"number"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"bank_time_start","default":"bank_time_start","title":"Type","type":"string"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["stream_id","seat","user_id","duration","schema_version","revision","server_time","type"],"title":"BankTimeStartMessage","type":"object"};
const schema49 = {"properties":{"name":{"title":"Name","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"text":{"maxLength":200,"minLength":1,"title":"Text","type":"string"},"type":{"const":"chat","default":"chat","title":"Type","type":"string"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["stream_id","user_id","name","text","schema_version","revision","server_time","type"],"title":"ChatMessage","type":"object"};
const schema50 = {"properties":{"command_id":{"maxLength":128,"minLength":1,"title":"Command Id","type":"string"},"command_type":{"enum":["sit","stand","action","add_chips","chat"],"title":"Command Type","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"status":{"const":"received","title":"Status","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"ack","default":"ack","title":"Type","type":"string"}},"required":["stream_id","command_id","command_type","status","schema_version","revision","server_time","type"],"title":"AckMessage","type":"object"};
const schema51 = {"properties":{"code":{"maxLength":128,"minLength":1,"title":"Code","type":"string"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"details":{"anyOf":[{"additionalProperties":true,"type":"object"},{"type":"null"}],"default":null,"title":"Details"},"message":{"minLength":1,"title":"Message","type":"string"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"error","default":"error","title":"Type","type":"string"}},"required":["stream_id","code","message","schema_version","revision","server_time","type"],"title":"ErrorMessage","type":"object"};
const schema32 = {"properties":{"action_on":{"title":"Action On","type":"integer"},"blinds":{"$ref":"#/$defs/BlindsData"},"community":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Community","type":"array"},"dealer":{"title":"Dealer","type":"integer"},"hand_num":{"minimum":0,"title":"Hand Num","type":"integer"},"phase":{"enum":["idle","posting","dealing","betting","showdown","complete"],"title":"Phase","type":"string"},"pots":{"items":{"$ref":"#/$defs/PotData"},"title":"Pots","type":"array"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seats":{"items":{"$ref":"#/$defs/SeatData"},"title":"Seats","type":"array"},"seed_hash":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Seed Hash"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"shown_cards":{"additionalProperties":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"type":"array"},"title":"Shown Cards","type":"object"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"street":{"enum":["preflop","flop","turn","river","showdown"],"title":"Street","type":"string"},"table_id":{"title":"Table Id","type":"string"},"table_name":{"title":"Table Name","type":"string"},"type":{"const":"table_state","default":"table_state","title":"Type","type":"string"},"winners":{"items":{"$ref":"#/$defs/WinnerData"},"title":"Winners","type":"array"},"your_cards":{"anyOf":[{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"type":"array"},{"type":"null"}],"default":null,"title":"Your Cards"}},"required":["stream_id","table_id","table_name","seats","community","pots","dealer","action_on","street","phase","hand_num","blinds","schema_version","revision","server_time","type"],"title":"TableStateMessage","type":"object"};
const schema33 = {"additionalProperties":false,"properties":{"big":{"minimum":0,"title":"Big","type":"integer"},"small":{"minimum":0,"title":"Small","type":"integer"}},"required":["small","big"],"title":"BlindsData","type":"object"};
const schema34 = {"properties":{"amount":{"minimum":0,"title":"Amount","type":"integer"},"eligible":{"items":{"minimum":0,"type":"integer"},"title":"Eligible","type":"array"}},"required":["amount","eligible"],"title":"PotData","type":"object"};
const schema35 = {"properties":{"current_bet":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Current Bet"},"name":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Name"},"portrait":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Portrait"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"stack":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Stack"},"status":{"enum":["empty","waiting","active","folded","allin","sitting_out"],"title":"Status","type":"string"},"user_id":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"User Id"}},"required":["seat","status"],"title":"SeatData","type":"object"};
const schema36 = {"properties":{"amount":{"minimum":0,"title":"Amount","type":"integer"},"hand":{"anyOf":[{"type":"string"},{"type":"null"}],"default":null,"title":"Hand"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"user_id":{"minimum":0,"title":"User Id","type":"integer"}},"required":["seat","user_id","amount"],"title":"WinnerData","type":"object"};
const pattern4 = new RegExp("^[2-9TJQKA][cdhs]$", "u");
const formats0 = runtimeModule0.fullFormats["date-time"];
const func1 = runtimeModule1.default;

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.table_id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "table_id"},message:"must have required property '"+"table_id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.table_name === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "table_name"},message:"must have required property '"+"table_name"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.seats === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "seats"},message:"must have required property '"+"seats"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.community === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "community"},message:"must have required property '"+"community"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.pots === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "pots"},message:"must have required property '"+"pots"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.dealer === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "dealer"},message:"must have required property '"+"dealer"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.action_on === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "action_on"},message:"must have required property '"+"action_on"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.street === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "street"},message:"must have required property '"+"street"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.phase === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "phase"},message:"must have required property '"+"phase"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.hand_num === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "hand_num"},message:"must have required property '"+"hand_num"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.blinds === undefined){
const err11 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "blinds"},message:"must have required property '"+"blinds"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.schema_version === undefined){
const err12 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.revision === undefined){
const err13 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.server_time === undefined){
const err14 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data.type === undefined){
const err15 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data.action_on !== undefined){
let data0 = data.action_on;
if(!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))){
const err16 = {instancePath:instancePath+"/action_on",schemaPath:"#/properties/action_on/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.blinds !== undefined){
let data1 = data.blinds;
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
if(data1.small === undefined){
const err17 = {instancePath:instancePath+"/blinds",schemaPath:"#/$defs/BlindsData/required",keyword:"required",params:{missingProperty: "small"},message:"must have required property '"+"small"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data1.big === undefined){
const err18 = {instancePath:instancePath+"/blinds",schemaPath:"#/$defs/BlindsData/required",keyword:"required",params:{missingProperty: "big"},message:"must have required property '"+"big"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
for(const key0 in data1){
if(!((key0 === "big") || (key0 === "small"))){
const err19 = {instancePath:instancePath+"/blinds",schemaPath:"#/$defs/BlindsData/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data1.big !== undefined){
let data2 = data1.big;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
const err20 = {instancePath:instancePath+"/blinds/big",schemaPath:"#/$defs/BlindsData/properties/big/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 < 0 || isNaN(data2)){
const err21 = {instancePath:instancePath+"/blinds/big",schemaPath:"#/$defs/BlindsData/properties/big/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
if(data1.small !== undefined){
let data3 = data1.small;
if(!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))){
const err22 = {instancePath:instancePath+"/blinds/small",schemaPath:"#/$defs/BlindsData/properties/small/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 < 0 || isNaN(data3)){
const err23 = {instancePath:instancePath+"/blinds/small",schemaPath:"#/$defs/BlindsData/properties/small/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
}
}
else {
const err24 = {instancePath:instancePath+"/blinds",schemaPath:"#/$defs/BlindsData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data.community !== undefined){
let data4 = data.community;
if(Array.isArray(data4)){
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
let data5 = data4[i0];
if(typeof data5 === "string"){
if(!pattern4.test(data5)){
const err25 = {instancePath:instancePath+"/community/" + i0,schemaPath:"#/properties/community/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
else {
const err26 = {instancePath:instancePath+"/community/" + i0,schemaPath:"#/properties/community/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
}
else {
const err27 = {instancePath:instancePath+"/community",schemaPath:"#/properties/community/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data.dealer !== undefined){
let data6 = data.dealer;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
const err28 = {instancePath:instancePath+"/dealer",schemaPath:"#/properties/dealer/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data.hand_num !== undefined){
let data7 = data.hand_num;
if(!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))){
const err29 = {instancePath:instancePath+"/hand_num",schemaPath:"#/properties/hand_num/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 < 0 || isNaN(data7)){
const err30 = {instancePath:instancePath+"/hand_num",schemaPath:"#/properties/hand_num/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
if(data.phase !== undefined){
let data8 = data.phase;
if(typeof data8 !== "string"){
const err31 = {instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(!((((((data8 === "idle") || (data8 === "posting")) || (data8 === "dealing")) || (data8 === "betting")) || (data8 === "showdown")) || (data8 === "complete"))){
const err32 = {instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/enum",keyword:"enum",params:{allowedValues: schema32.properties.phase.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.pots !== undefined){
let data9 = data.pots;
if(Array.isArray(data9)){
const len1 = data9.length;
for(let i1=0; i1<len1; i1++){
let data10 = data9[i1];
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.amount === undefined){
const err33 = {instancePath:instancePath+"/pots/" + i1,schemaPath:"#/$defs/PotData/required",keyword:"required",params:{missingProperty: "amount"},message:"must have required property '"+"amount"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data10.eligible === undefined){
const err34 = {instancePath:instancePath+"/pots/" + i1,schemaPath:"#/$defs/PotData/required",keyword:"required",params:{missingProperty: "eligible"},message:"must have required property '"+"eligible"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data10.amount !== undefined){
let data11 = data10.amount;
if(!(((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11))) && (isFinite(data11)))){
const err35 = {instancePath:instancePath+"/pots/" + i1+"/amount",schemaPath:"#/$defs/PotData/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if((typeof data11 == "number") && (isFinite(data11))){
if(data11 < 0 || isNaN(data11)){
const err36 = {instancePath:instancePath+"/pots/" + i1+"/amount",schemaPath:"#/$defs/PotData/properties/amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
if(data10.eligible !== undefined){
let data12 = data10.eligible;
if(Array.isArray(data12)){
const len2 = data12.length;
for(let i2=0; i2<len2; i2++){
let data13 = data12[i2];
if(!(((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13))) && (isFinite(data13)))){
const err37 = {instancePath:instancePath+"/pots/" + i1+"/eligible/" + i2,schemaPath:"#/$defs/PotData/properties/eligible/items/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if((typeof data13 == "number") && (isFinite(data13))){
if(data13 < 0 || isNaN(data13)){
const err38 = {instancePath:instancePath+"/pots/" + i1+"/eligible/" + i2,schemaPath:"#/$defs/PotData/properties/eligible/items/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
}
else {
const err39 = {instancePath:instancePath+"/pots/" + i1+"/eligible",schemaPath:"#/$defs/PotData/properties/eligible/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
else {
const err40 = {instancePath:instancePath+"/pots/" + i1,schemaPath:"#/$defs/PotData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
}
else {
const err41 = {instancePath:instancePath+"/pots",schemaPath:"#/properties/pots/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data.revision !== undefined){
let data14 = data.revision;
if(!(((typeof data14 == "number") && (!(data14 % 1) && !isNaN(data14))) && (isFinite(data14)))){
const err42 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if((typeof data14 == "number") && (isFinite(data14))){
if(data14 < 0 || isNaN(data14)){
const err43 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data15 = data.schema_version;
if(!(((typeof data15 == "number") && (!(data15 % 1) && !isNaN(data15))) && (isFinite(data15)))){
const err44 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(1 !== data15){
const err45 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data.seats !== undefined){
let data16 = data.seats;
if(Array.isArray(data16)){
const len3 = data16.length;
for(let i3=0; i3<len3; i3++){
let data17 = data16[i3];
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
if(data17.seat === undefined){
const err46 = {instancePath:instancePath+"/seats/" + i3,schemaPath:"#/$defs/SeatData/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if(data17.status === undefined){
const err47 = {instancePath:instancePath+"/seats/" + i3,schemaPath:"#/$defs/SeatData/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data17.current_bet !== undefined){
let data18 = data17.current_bet;
const _errs42 = errors;
let valid15 = false;
const _errs43 = errors;
if(!(((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18))) && (isFinite(data18)))){
const err48 = {instancePath:instancePath+"/seats/" + i3+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if((typeof data18 == "number") && (isFinite(data18))){
if(data18 < 0 || isNaN(data18)){
const err49 = {instancePath:instancePath+"/seats/" + i3+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
var _valid0 = _errs43 === errors;
valid15 = valid15 || _valid0;
const _errs45 = errors;
if(data18 !== null){
const err50 = {instancePath:instancePath+"/seats/" + i3+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
var _valid0 = _errs45 === errors;
valid15 = valid15 || _valid0;
if(!valid15){
const err51 = {instancePath:instancePath+"/seats/" + i3+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
else {
errors = _errs42;
if(vErrors !== null){
if(_errs42){
vErrors.length = _errs42;
}
else {
vErrors = null;
}
}
}
}
if(data17.name !== undefined){
let data19 = data17.name;
const _errs48 = errors;
let valid16 = false;
const _errs49 = errors;
if(typeof data19 !== "string"){
const err52 = {instancePath:instancePath+"/seats/" + i3+"/name",schemaPath:"#/$defs/SeatData/properties/name/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
var _valid1 = _errs49 === errors;
valid16 = valid16 || _valid1;
const _errs51 = errors;
if(data19 !== null){
const err53 = {instancePath:instancePath+"/seats/" + i3+"/name",schemaPath:"#/$defs/SeatData/properties/name/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
var _valid1 = _errs51 === errors;
valid16 = valid16 || _valid1;
if(!valid16){
const err54 = {instancePath:instancePath+"/seats/" + i3+"/name",schemaPath:"#/$defs/SeatData/properties/name/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
else {
errors = _errs48;
if(vErrors !== null){
if(_errs48){
vErrors.length = _errs48;
}
else {
vErrors = null;
}
}
}
}
if(data17.portrait !== undefined){
let data20 = data17.portrait;
const _errs54 = errors;
let valid17 = false;
const _errs55 = errors;
if(typeof data20 !== "string"){
const err55 = {instancePath:instancePath+"/seats/" + i3+"/portrait",schemaPath:"#/$defs/SeatData/properties/portrait/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
var _valid2 = _errs55 === errors;
valid17 = valid17 || _valid2;
const _errs57 = errors;
if(data20 !== null){
const err56 = {instancePath:instancePath+"/seats/" + i3+"/portrait",schemaPath:"#/$defs/SeatData/properties/portrait/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
var _valid2 = _errs57 === errors;
valid17 = valid17 || _valid2;
if(!valid17){
const err57 = {instancePath:instancePath+"/seats/" + i3+"/portrait",schemaPath:"#/$defs/SeatData/properties/portrait/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
else {
errors = _errs54;
if(vErrors !== null){
if(_errs54){
vErrors.length = _errs54;
}
else {
vErrors = null;
}
}
}
}
if(data17.seat !== undefined){
let data21 = data17.seat;
if(!(((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21))) && (isFinite(data21)))){
const err58 = {instancePath:instancePath+"/seats/" + i3+"/seat",schemaPath:"#/$defs/SeatData/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
if((typeof data21 == "number") && (isFinite(data21))){
if(data21 < 0 || isNaN(data21)){
const err59 = {instancePath:instancePath+"/seats/" + i3+"/seat",schemaPath:"#/$defs/SeatData/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
}
if(data17.stack !== undefined){
let data22 = data17.stack;
const _errs62 = errors;
let valid18 = false;
const _errs63 = errors;
if(!(((typeof data22 == "number") && (!(data22 % 1) && !isNaN(data22))) && (isFinite(data22)))){
const err60 = {instancePath:instancePath+"/seats/" + i3+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if((typeof data22 == "number") && (isFinite(data22))){
if(data22 < 0 || isNaN(data22)){
const err61 = {instancePath:instancePath+"/seats/" + i3+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
var _valid3 = _errs63 === errors;
valid18 = valid18 || _valid3;
const _errs65 = errors;
if(data22 !== null){
const err62 = {instancePath:instancePath+"/seats/" + i3+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
var _valid3 = _errs65 === errors;
valid18 = valid18 || _valid3;
if(!valid18){
const err63 = {instancePath:instancePath+"/seats/" + i3+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
else {
errors = _errs62;
if(vErrors !== null){
if(_errs62){
vErrors.length = _errs62;
}
else {
vErrors = null;
}
}
}
}
if(data17.status !== undefined){
let data23 = data17.status;
if(typeof data23 !== "string"){
const err64 = {instancePath:instancePath+"/seats/" + i3+"/status",schemaPath:"#/$defs/SeatData/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
if(!((((((data23 === "empty") || (data23 === "waiting")) || (data23 === "active")) || (data23 === "folded")) || (data23 === "allin")) || (data23 === "sitting_out"))){
const err65 = {instancePath:instancePath+"/seats/" + i3+"/status",schemaPath:"#/$defs/SeatData/properties/status/enum",keyword:"enum",params:{allowedValues: schema35.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data17.user_id !== undefined){
let data24 = data17.user_id;
const _errs70 = errors;
let valid19 = false;
const _errs71 = errors;
if(!(((typeof data24 == "number") && (!(data24 % 1) && !isNaN(data24))) && (isFinite(data24)))){
const err66 = {instancePath:instancePath+"/seats/" + i3+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
if((typeof data24 == "number") && (isFinite(data24))){
if(data24 < 0 || isNaN(data24)){
const err67 = {instancePath:instancePath+"/seats/" + i3+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
var _valid4 = _errs71 === errors;
valid19 = valid19 || _valid4;
const _errs73 = errors;
if(data24 !== null){
const err68 = {instancePath:instancePath+"/seats/" + i3+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
var _valid4 = _errs73 === errors;
valid19 = valid19 || _valid4;
if(!valid19){
const err69 = {instancePath:instancePath+"/seats/" + i3+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
else {
errors = _errs70;
if(vErrors !== null){
if(_errs70){
vErrors.length = _errs70;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err70 = {instancePath:instancePath+"/seats/" + i3,schemaPath:"#/$defs/SeatData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
}
else {
const err71 = {instancePath:instancePath+"/seats",schemaPath:"#/properties/seats/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
if(data.seed_hash !== undefined){
let data25 = data.seed_hash;
const _errs76 = errors;
let valid20 = false;
const _errs77 = errors;
if(typeof data25 !== "string"){
const err72 = {instancePath:instancePath+"/seed_hash",schemaPath:"#/properties/seed_hash/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
var _valid5 = _errs77 === errors;
valid20 = valid20 || _valid5;
const _errs79 = errors;
if(data25 !== null){
const err73 = {instancePath:instancePath+"/seed_hash",schemaPath:"#/properties/seed_hash/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
var _valid5 = _errs79 === errors;
valid20 = valid20 || _valid5;
if(!valid20){
const err74 = {instancePath:instancePath+"/seed_hash",schemaPath:"#/properties/seed_hash/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
else {
errors = _errs76;
if(vErrors !== null){
if(_errs76){
vErrors.length = _errs76;
}
else {
vErrors = null;
}
}
}
}
if(data.server_time !== undefined){
let data26 = data.server_time;
if(typeof data26 === "string"){
if(!(formats0.validate(data26))){
const err75 = {instancePath:instancePath+"/server_time",schemaPath:"#/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
else {
const err76 = {instancePath:instancePath+"/server_time",schemaPath:"#/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
if(data.shown_cards !== undefined){
let data27 = data.shown_cards;
if(data27 && typeof data27 == "object" && !Array.isArray(data27)){
for(const key1 in data27){
let data28 = data27[key1];
if(Array.isArray(data28)){
const len4 = data28.length;
for(let i4=0; i4<len4; i4++){
let data29 = data28[i4];
if(typeof data29 === "string"){
if(!pattern4.test(data29)){
const err77 = {instancePath:instancePath+"/shown_cards/" + key1.replace(/~/g, "~0").replace(/\//g, "~1")+"/" + i4,schemaPath:"#/properties/shown_cards/additionalProperties/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
else {
const err78 = {instancePath:instancePath+"/shown_cards/" + key1.replace(/~/g, "~0").replace(/\//g, "~1")+"/" + i4,schemaPath:"#/properties/shown_cards/additionalProperties/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
}
else {
const err79 = {instancePath:instancePath+"/shown_cards/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/shown_cards/additionalProperties/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath:instancePath+"/shown_cards",schemaPath:"#/properties/shown_cards/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data30 = data.stream_id;
if(typeof data30 === "string"){
if(func1(data30) > 128){
const err81 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
if(func1(data30) < 1){
const err82 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
else {
const err83 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
if(data.street !== undefined){
let data31 = data.street;
if(typeof data31 !== "string"){
const err84 = {instancePath:instancePath+"/street",schemaPath:"#/properties/street/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
if(!(((((data31 === "preflop") || (data31 === "flop")) || (data31 === "turn")) || (data31 === "river")) || (data31 === "showdown"))){
const err85 = {instancePath:instancePath+"/street",schemaPath:"#/properties/street/enum",keyword:"enum",params:{allowedValues: schema32.properties.street.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
if(data.table_id !== undefined){
if(typeof data.table_id !== "string"){
const err86 = {instancePath:instancePath+"/table_id",schemaPath:"#/properties/table_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
if(data.table_name !== undefined){
if(typeof data.table_name !== "string"){
const err87 = {instancePath:instancePath+"/table_name",schemaPath:"#/properties/table_name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
}
if(data.type !== undefined){
let data34 = data.type;
if(typeof data34 !== "string"){
const err88 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
if("table_state" !== data34){
const err89 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "table_state"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
if(data.winners !== undefined){
let data35 = data.winners;
if(Array.isArray(data35)){
const len5 = data35.length;
for(let i5=0; i5<len5; i5++){
let data36 = data35[i5];
if(data36 && typeof data36 == "object" && !Array.isArray(data36)){
if(data36.seat === undefined){
const err90 = {instancePath:instancePath+"/winners/" + i5,schemaPath:"#/$defs/WinnerData/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
if(data36.user_id === undefined){
const err91 = {instancePath:instancePath+"/winners/" + i5,schemaPath:"#/$defs/WinnerData/required",keyword:"required",params:{missingProperty: "user_id"},message:"must have required property '"+"user_id"+"'"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
if(data36.amount === undefined){
const err92 = {instancePath:instancePath+"/winners/" + i5,schemaPath:"#/$defs/WinnerData/required",keyword:"required",params:{missingProperty: "amount"},message:"must have required property '"+"amount"+"'"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if(data36.amount !== undefined){
let data37 = data36.amount;
if(!(((typeof data37 == "number") && (!(data37 % 1) && !isNaN(data37))) && (isFinite(data37)))){
const err93 = {instancePath:instancePath+"/winners/" + i5+"/amount",schemaPath:"#/$defs/WinnerData/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
if((typeof data37 == "number") && (isFinite(data37))){
if(data37 < 0 || isNaN(data37)){
const err94 = {instancePath:instancePath+"/winners/" + i5+"/amount",schemaPath:"#/$defs/WinnerData/properties/amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
}
if(data36.hand !== undefined){
let data38 = data36.hand;
const _errs108 = errors;
let valid28 = false;
const _errs109 = errors;
if(typeof data38 !== "string"){
const err95 = {instancePath:instancePath+"/winners/" + i5+"/hand",schemaPath:"#/$defs/WinnerData/properties/hand/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
var _valid6 = _errs109 === errors;
valid28 = valid28 || _valid6;
const _errs111 = errors;
if(data38 !== null){
const err96 = {instancePath:instancePath+"/winners/" + i5+"/hand",schemaPath:"#/$defs/WinnerData/properties/hand/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
var _valid6 = _errs111 === errors;
valid28 = valid28 || _valid6;
if(!valid28){
const err97 = {instancePath:instancePath+"/winners/" + i5+"/hand",schemaPath:"#/$defs/WinnerData/properties/hand/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
else {
errors = _errs108;
if(vErrors !== null){
if(_errs108){
vErrors.length = _errs108;
}
else {
vErrors = null;
}
}
}
}
if(data36.seat !== undefined){
let data39 = data36.seat;
if(!(((typeof data39 == "number") && (!(data39 % 1) && !isNaN(data39))) && (isFinite(data39)))){
const err98 = {instancePath:instancePath+"/winners/" + i5+"/seat",schemaPath:"#/$defs/WinnerData/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
if((typeof data39 == "number") && (isFinite(data39))){
if(data39 < 0 || isNaN(data39)){
const err99 = {instancePath:instancePath+"/winners/" + i5+"/seat",schemaPath:"#/$defs/WinnerData/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
}
}
if(data36.user_id !== undefined){
let data40 = data36.user_id;
if(!(((typeof data40 == "number") && (!(data40 % 1) && !isNaN(data40))) && (isFinite(data40)))){
const err100 = {instancePath:instancePath+"/winners/" + i5+"/user_id",schemaPath:"#/$defs/WinnerData/properties/user_id/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
if((typeof data40 == "number") && (isFinite(data40))){
if(data40 < 0 || isNaN(data40)){
const err101 = {instancePath:instancePath+"/winners/" + i5+"/user_id",schemaPath:"#/$defs/WinnerData/properties/user_id/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
}
}
}
else {
const err102 = {instancePath:instancePath+"/winners/" + i5,schemaPath:"#/$defs/WinnerData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
}
}
else {
const err103 = {instancePath:instancePath+"/winners",schemaPath:"#/properties/winners/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
}
if(data.your_cards !== undefined){
let data41 = data.your_cards;
const _errs118 = errors;
let valid29 = false;
const _errs119 = errors;
if(Array.isArray(data41)){
const len6 = data41.length;
for(let i6=0; i6<len6; i6++){
let data42 = data41[i6];
if(typeof data42 === "string"){
if(!pattern4.test(data42)){
const err104 = {instancePath:instancePath+"/your_cards/" + i6,schemaPath:"#/properties/your_cards/anyOf/0/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
}
else {
const err105 = {instancePath:instancePath+"/your_cards/" + i6,schemaPath:"#/properties/your_cards/anyOf/0/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
}
else {
const err106 = {instancePath:instancePath+"/your_cards",schemaPath:"#/properties/your_cards/anyOf/0/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
var _valid7 = _errs119 === errors;
valid29 = valid29 || _valid7;
const _errs123 = errors;
if(data41 !== null){
const err107 = {instancePath:instancePath+"/your_cards",schemaPath:"#/properties/your_cards/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
var _valid7 = _errs123 === errors;
valid29 = valid29 || _valid7;
if(!valid29){
const err108 = {instancePath:instancePath+"/your_cards",schemaPath:"#/properties/your_cards/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
else {
errors = _errs118;
if(vErrors !== null){
if(_errs118){
vErrors.length = _errs118;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err109 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":{"action_on":true,"blinds":true,"community":true,"dealer":true,"hand_num":true,"phase":true,"pots":true,"revision":true,"schema_version":true,"seats":true,"seed_hash":true,"server_time":true,"shown_cards":true,"stream_id":true,"street":true,"table_id":true,"table_name":true,"type":true,"winners":true,"your_cards":true},"dynamicProps":false,"dynamicItems":false};

const schema37 = {"properties":{"dealer":{"title":"Dealer","type":"integer"},"hand_num":{"minimum":0,"title":"Hand Num","type":"integer"},"pot":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Pot"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"seats":{"anyOf":[{"items":{"$ref":"#/$defs/SeatData"},"type":"array"},{"type":"null"}],"default":null,"title":"Seats"},"seed_hash":{"minLength":1,"title":"Seed Hash","type":"string"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"hand_start","default":"hand_start","title":"Type","type":"string"}},"required":["stream_id","hand_num","seed_hash","dealer","schema_version","revision","server_time","type"],"title":"HandStartMessage","type":"object"};

function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.hand_num === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "hand_num"},message:"must have required property '"+"hand_num"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.seed_hash === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "seed_hash"},message:"must have required property '"+"seed_hash"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.dealer === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "dealer"},message:"must have required property '"+"dealer"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.schema_version === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.revision === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.server_time === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.type === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.dealer !== undefined){
let data0 = data.dealer;
if(!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))){
const err8 = {instancePath:instancePath+"/dealer",schemaPath:"#/properties/dealer/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.hand_num !== undefined){
let data1 = data.hand_num;
if(!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))){
const err9 = {instancePath:instancePath+"/hand_num",schemaPath:"#/properties/hand_num/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 < 0 || isNaN(data1)){
const err10 = {instancePath:instancePath+"/hand_num",schemaPath:"#/properties/hand_num/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
if(data.pot !== undefined){
let data2 = data.pot;
const _errs6 = errors;
let valid1 = false;
const _errs7 = errors;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
const err11 = {instancePath:instancePath+"/pot",schemaPath:"#/properties/pot/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 < 0 || isNaN(data2)){
const err12 = {instancePath:instancePath+"/pot",schemaPath:"#/properties/pot/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
var _valid0 = _errs7 === errors;
valid1 = valid1 || _valid0;
const _errs9 = errors;
if(data2 !== null){
const err13 = {instancePath:instancePath+"/pot",schemaPath:"#/properties/pot/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var _valid0 = _errs9 === errors;
valid1 = valid1 || _valid0;
if(!valid1){
const err14 = {instancePath:instancePath+"/pot",schemaPath:"#/properties/pot/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
else {
errors = _errs6;
if(vErrors !== null){
if(_errs6){
vErrors.length = _errs6;
}
else {
vErrors = null;
}
}
}
}
if(data.revision !== undefined){
let data3 = data.revision;
if(!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))){
const err15 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 < 0 || isNaN(data3)){
const err16 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data4 = data.schema_version;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
const err17 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(1 !== data4){
const err18 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.seats !== undefined){
let data5 = data.seats;
const _errs16 = errors;
let valid2 = false;
const _errs17 = errors;
if(Array.isArray(data5)){
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
let data6 = data5[i0];
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.seat === undefined){
const err19 = {instancePath:instancePath+"/seats/" + i0,schemaPath:"#/$defs/SeatData/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data6.status === undefined){
const err20 = {instancePath:instancePath+"/seats/" + i0,schemaPath:"#/$defs/SeatData/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data6.current_bet !== undefined){
let data7 = data6.current_bet;
const _errs23 = errors;
let valid7 = false;
const _errs24 = errors;
if(!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))){
const err21 = {instancePath:instancePath+"/seats/" + i0+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 < 0 || isNaN(data7)){
const err22 = {instancePath:instancePath+"/seats/" + i0+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
var _valid2 = _errs24 === errors;
valid7 = valid7 || _valid2;
const _errs26 = errors;
if(data7 !== null){
const err23 = {instancePath:instancePath+"/seats/" + i0+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
var _valid2 = _errs26 === errors;
valid7 = valid7 || _valid2;
if(!valid7){
const err24 = {instancePath:instancePath+"/seats/" + i0+"/current_bet",schemaPath:"#/$defs/SeatData/properties/current_bet/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
else {
errors = _errs23;
if(vErrors !== null){
if(_errs23){
vErrors.length = _errs23;
}
else {
vErrors = null;
}
}
}
}
if(data6.name !== undefined){
let data8 = data6.name;
const _errs29 = errors;
let valid8 = false;
const _errs30 = errors;
if(typeof data8 !== "string"){
const err25 = {instancePath:instancePath+"/seats/" + i0+"/name",schemaPath:"#/$defs/SeatData/properties/name/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid3 = _errs30 === errors;
valid8 = valid8 || _valid3;
const _errs32 = errors;
if(data8 !== null){
const err26 = {instancePath:instancePath+"/seats/" + i0+"/name",schemaPath:"#/$defs/SeatData/properties/name/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
var _valid3 = _errs32 === errors;
valid8 = valid8 || _valid3;
if(!valid8){
const err27 = {instancePath:instancePath+"/seats/" + i0+"/name",schemaPath:"#/$defs/SeatData/properties/name/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
else {
errors = _errs29;
if(vErrors !== null){
if(_errs29){
vErrors.length = _errs29;
}
else {
vErrors = null;
}
}
}
}
if(data6.portrait !== undefined){
let data9 = data6.portrait;
const _errs35 = errors;
let valid9 = false;
const _errs36 = errors;
if(typeof data9 !== "string"){
const err28 = {instancePath:instancePath+"/seats/" + i0+"/portrait",schemaPath:"#/$defs/SeatData/properties/portrait/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var _valid4 = _errs36 === errors;
valid9 = valid9 || _valid4;
const _errs38 = errors;
if(data9 !== null){
const err29 = {instancePath:instancePath+"/seats/" + i0+"/portrait",schemaPath:"#/$defs/SeatData/properties/portrait/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
var _valid4 = _errs38 === errors;
valid9 = valid9 || _valid4;
if(!valid9){
const err30 = {instancePath:instancePath+"/seats/" + i0+"/portrait",schemaPath:"#/$defs/SeatData/properties/portrait/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
else {
errors = _errs35;
if(vErrors !== null){
if(_errs35){
vErrors.length = _errs35;
}
else {
vErrors = null;
}
}
}
}
if(data6.seat !== undefined){
let data10 = data6.seat;
if(!(((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10))) && (isFinite(data10)))){
const err31 = {instancePath:instancePath+"/seats/" + i0+"/seat",schemaPath:"#/$defs/SeatData/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if((typeof data10 == "number") && (isFinite(data10))){
if(data10 < 0 || isNaN(data10)){
const err32 = {instancePath:instancePath+"/seats/" + i0+"/seat",schemaPath:"#/$defs/SeatData/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
}
if(data6.stack !== undefined){
let data11 = data6.stack;
const _errs43 = errors;
let valid10 = false;
const _errs44 = errors;
if(!(((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11))) && (isFinite(data11)))){
const err33 = {instancePath:instancePath+"/seats/" + i0+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if((typeof data11 == "number") && (isFinite(data11))){
if(data11 < 0 || isNaN(data11)){
const err34 = {instancePath:instancePath+"/seats/" + i0+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
var _valid5 = _errs44 === errors;
valid10 = valid10 || _valid5;
const _errs46 = errors;
if(data11 !== null){
const err35 = {instancePath:instancePath+"/seats/" + i0+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
var _valid5 = _errs46 === errors;
valid10 = valid10 || _valid5;
if(!valid10){
const err36 = {instancePath:instancePath+"/seats/" + i0+"/stack",schemaPath:"#/$defs/SeatData/properties/stack/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
else {
errors = _errs43;
if(vErrors !== null){
if(_errs43){
vErrors.length = _errs43;
}
else {
vErrors = null;
}
}
}
}
if(data6.status !== undefined){
let data12 = data6.status;
if(typeof data12 !== "string"){
const err37 = {instancePath:instancePath+"/seats/" + i0+"/status",schemaPath:"#/$defs/SeatData/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(!((((((data12 === "empty") || (data12 === "waiting")) || (data12 === "active")) || (data12 === "folded")) || (data12 === "allin")) || (data12 === "sitting_out"))){
const err38 = {instancePath:instancePath+"/seats/" + i0+"/status",schemaPath:"#/$defs/SeatData/properties/status/enum",keyword:"enum",params:{allowedValues: schema35.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data6.user_id !== undefined){
let data13 = data6.user_id;
const _errs51 = errors;
let valid11 = false;
const _errs52 = errors;
if(!(((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13))) && (isFinite(data13)))){
const err39 = {instancePath:instancePath+"/seats/" + i0+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if((typeof data13 == "number") && (isFinite(data13))){
if(data13 < 0 || isNaN(data13)){
const err40 = {instancePath:instancePath+"/seats/" + i0+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
var _valid6 = _errs52 === errors;
valid11 = valid11 || _valid6;
const _errs54 = errors;
if(data13 !== null){
const err41 = {instancePath:instancePath+"/seats/" + i0+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
var _valid6 = _errs54 === errors;
valid11 = valid11 || _valid6;
if(!valid11){
const err42 = {instancePath:instancePath+"/seats/" + i0+"/user_id",schemaPath:"#/$defs/SeatData/properties/user_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
else {
errors = _errs51;
if(vErrors !== null){
if(_errs51){
vErrors.length = _errs51;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err43 = {instancePath:instancePath+"/seats/" + i0,schemaPath:"#/$defs/SeatData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath:instancePath+"/seats",schemaPath:"#/properties/seats/anyOf/0/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
var _valid1 = _errs17 === errors;
valid2 = valid2 || _valid1;
const _errs56 = errors;
if(data5 !== null){
const err45 = {instancePath:instancePath+"/seats",schemaPath:"#/properties/seats/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
var _valid1 = _errs56 === errors;
valid2 = valid2 || _valid1;
if(!valid2){
const err46 = {instancePath:instancePath+"/seats",schemaPath:"#/properties/seats/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
}
if(data.seed_hash !== undefined){
let data14 = data.seed_hash;
if(typeof data14 === "string"){
if(func1(data14) < 1){
const err47 = {instancePath:instancePath+"/seed_hash",schemaPath:"#/properties/seed_hash/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
else {
const err48 = {instancePath:instancePath+"/seed_hash",schemaPath:"#/properties/seed_hash/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data.server_time !== undefined){
let data15 = data.server_time;
if(typeof data15 === "string"){
if(!(formats0.validate(data15))){
const err49 = {instancePath:instancePath+"/server_time",schemaPath:"#/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
else {
const err50 = {instancePath:instancePath+"/server_time",schemaPath:"#/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data16 = data.stream_id;
if(typeof data16 === "string"){
if(func1(data16) > 128){
const err51 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(func1(data16) < 1){
const err52 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
else {
const err53 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data.type !== undefined){
let data17 = data.type;
if(typeof data17 !== "string"){
const err54 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if("hand_start" !== data17){
const err55 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "hand_start"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
}
else {
const err56 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
validate23.errors = vErrors;
return errors === 0;
}
validate23.evaluated = {"props":{"dealer":true,"hand_num":true,"pot":true,"revision":true,"schema_version":true,"seats":true,"seed_hash":true,"server_time":true,"stream_id":true,"type":true},"dynamicProps":false,"dynamicItems":false};

const schema44 = {"properties":{"community":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"title":"Community","type":"array"},"pots":{"items":{"$ref":"#/$defs/PotData"},"title":"Pots","type":"array"},"rake":{"anyOf":[{"minimum":0,"type":"integer"},{"type":"null"}],"default":null,"title":"Rake"},"revision":{"default":0,"minimum":0,"title":"Revision","type":"integer"},"schema_version":{"const":1,"default":1,"title":"Schema Version","type":"integer"},"server_seed":{"title":"Server Seed","type":"string"},"server_time":{"format":"date-time","title":"Server Time","type":"string"},"shown_cards":{"additionalProperties":{"items":{"pattern":"^[2-9TJQKA][cdhs]$","type":"string"},"type":"array"},"title":"Shown Cards","type":"object"},"stream_id":{"maxLength":128,"minLength":1,"title":"Stream Id","type":"string"},"type":{"const":"hand_result","default":"hand_result","title":"Type","type":"string"},"winners":{"items":{"$ref":"#/$defs/WinnerData"},"title":"Winners","type":"array"}},"required":["stream_id","community","winners","shown_cards","pots","server_seed","schema_version","revision","server_time","type"],"title":"HandResultMessage","type":"object"};

function validate25(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate25.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.community === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "community"},message:"must have required property '"+"community"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.winners === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "winners"},message:"must have required property '"+"winners"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.shown_cards === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "shown_cards"},message:"must have required property '"+"shown_cards"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.pots === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "pots"},message:"must have required property '"+"pots"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.server_seed === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "server_seed"},message:"must have required property '"+"server_seed"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.schema_version === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.revision === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.server_time === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.type === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.community !== undefined){
let data0 = data.community;
if(Array.isArray(data0)){
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
let data1 = data0[i0];
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
const err10 = {instancePath:instancePath+"/community/" + i0,schemaPath:"#/properties/community/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/community/" + i0,schemaPath:"#/properties/community/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
}
else {
const err12 = {instancePath:instancePath+"/community",schemaPath:"#/properties/community/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.pots !== undefined){
let data2 = data.pots;
if(Array.isArray(data2)){
const len1 = data2.length;
for(let i1=0; i1<len1; i1++){
let data3 = data2[i1];
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.amount === undefined){
const err13 = {instancePath:instancePath+"/pots/" + i1,schemaPath:"#/$defs/PotData/required",keyword:"required",params:{missingProperty: "amount"},message:"must have required property '"+"amount"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.eligible === undefined){
const err14 = {instancePath:instancePath+"/pots/" + i1,schemaPath:"#/$defs/PotData/required",keyword:"required",params:{missingProperty: "eligible"},message:"must have required property '"+"eligible"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.amount !== undefined){
let data4 = data3.amount;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
const err15 = {instancePath:instancePath+"/pots/" + i1+"/amount",schemaPath:"#/$defs/PotData/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 < 0 || isNaN(data4)){
const err16 = {instancePath:instancePath+"/pots/" + i1+"/amount",schemaPath:"#/$defs/PotData/properties/amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
if(data3.eligible !== undefined){
let data5 = data3.eligible;
if(Array.isArray(data5)){
const len2 = data5.length;
for(let i2=0; i2<len2; i2++){
let data6 = data5[i2];
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
const err17 = {instancePath:instancePath+"/pots/" + i1+"/eligible/" + i2,schemaPath:"#/$defs/PotData/properties/eligible/items/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 < 0 || isNaN(data6)){
const err18 = {instancePath:instancePath+"/pots/" + i1+"/eligible/" + i2,schemaPath:"#/$defs/PotData/properties/eligible/items/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
}
else {
const err19 = {instancePath:instancePath+"/pots/" + i1+"/eligible",schemaPath:"#/$defs/PotData/properties/eligible/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath:instancePath+"/pots/" + i1,schemaPath:"#/$defs/PotData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
}
else {
const err21 = {instancePath:instancePath+"/pots",schemaPath:"#/properties/pots/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.rake !== undefined){
let data7 = data.rake;
const _errs17 = errors;
let valid9 = false;
const _errs18 = errors;
if(!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))){
const err22 = {instancePath:instancePath+"/rake",schemaPath:"#/properties/rake/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 < 0 || isNaN(data7)){
const err23 = {instancePath:instancePath+"/rake",schemaPath:"#/properties/rake/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
var _valid0 = _errs18 === errors;
valid9 = valid9 || _valid0;
const _errs20 = errors;
if(data7 !== null){
const err24 = {instancePath:instancePath+"/rake",schemaPath:"#/properties/rake/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
var _valid0 = _errs20 === errors;
valid9 = valid9 || _valid0;
if(!valid9){
const err25 = {instancePath:instancePath+"/rake",schemaPath:"#/properties/rake/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
else {
errors = _errs17;
if(vErrors !== null){
if(_errs17){
vErrors.length = _errs17;
}
else {
vErrors = null;
}
}
}
}
if(data.revision !== undefined){
let data8 = data.revision;
if(!(((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8))) && (isFinite(data8)))){
const err26 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if((typeof data8 == "number") && (isFinite(data8))){
if(data8 < 0 || isNaN(data8)){
const err27 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data9 = data.schema_version;
if(!(((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9))) && (isFinite(data9)))){
const err28 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(1 !== data9){
const err29 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data.server_seed !== undefined){
if(typeof data.server_seed !== "string"){
const err30 = {instancePath:instancePath+"/server_seed",schemaPath:"#/properties/server_seed/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.server_time !== undefined){
let data11 = data.server_time;
if(typeof data11 === "string"){
if(!(formats0.validate(data11))){
const err31 = {instancePath:instancePath+"/server_time",schemaPath:"#/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
else {
const err32 = {instancePath:instancePath+"/server_time",schemaPath:"#/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.shown_cards !== undefined){
let data12 = data.shown_cards;
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
for(const key0 in data12){
let data13 = data12[key0];
if(Array.isArray(data13)){
const len3 = data13.length;
for(let i3=0; i3<len3; i3++){
let data14 = data13[i3];
if(typeof data14 === "string"){
if(!pattern4.test(data14)){
const err33 = {instancePath:instancePath+"/shown_cards/" + key0.replace(/~/g, "~0").replace(/\//g, "~1")+"/" + i3,schemaPath:"#/properties/shown_cards/additionalProperties/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/shown_cards/" + key0.replace(/~/g, "~0").replace(/\//g, "~1")+"/" + i3,schemaPath:"#/properties/shown_cards/additionalProperties/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
}
else {
const err35 = {instancePath:instancePath+"/shown_cards/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/shown_cards/additionalProperties/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
}
else {
const err36 = {instancePath:instancePath+"/shown_cards",schemaPath:"#/properties/shown_cards/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data15 = data.stream_id;
if(typeof data15 === "string"){
if(func1(data15) > 128){
const err37 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(func1(data15) < 1){
const err38 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
else {
const err39 = {instancePath:instancePath+"/stream_id",schemaPath:"#/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
if(data.type !== undefined){
let data16 = data.type;
if(typeof data16 !== "string"){
const err40 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if("hand_result" !== data16){
const err41 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "hand_result"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data.winners !== undefined){
let data17 = data.winners;
if(Array.isArray(data17)){
const len4 = data17.length;
for(let i4=0; i4<len4; i4++){
let data18 = data17[i4];
if(data18 && typeof data18 == "object" && !Array.isArray(data18)){
if(data18.seat === undefined){
const err42 = {instancePath:instancePath+"/winners/" + i4,schemaPath:"#/$defs/WinnerData/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data18.user_id === undefined){
const err43 = {instancePath:instancePath+"/winners/" + i4,schemaPath:"#/$defs/WinnerData/required",keyword:"required",params:{missingProperty: "user_id"},message:"must have required property '"+"user_id"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data18.amount === undefined){
const err44 = {instancePath:instancePath+"/winners/" + i4,schemaPath:"#/$defs/WinnerData/required",keyword:"required",params:{missingProperty: "amount"},message:"must have required property '"+"amount"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data18.amount !== undefined){
let data19 = data18.amount;
if(!(((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19))) && (isFinite(data19)))){
const err45 = {instancePath:instancePath+"/winners/" + i4+"/amount",schemaPath:"#/$defs/WinnerData/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if((typeof data19 == "number") && (isFinite(data19))){
if(data19 < 0 || isNaN(data19)){
const err46 = {instancePath:instancePath+"/winners/" + i4+"/amount",schemaPath:"#/$defs/WinnerData/properties/amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
}
if(data18.hand !== undefined){
let data20 = data18.hand;
const _errs49 = errors;
let valid17 = false;
const _errs50 = errors;
if(typeof data20 !== "string"){
const err47 = {instancePath:instancePath+"/winners/" + i4+"/hand",schemaPath:"#/$defs/WinnerData/properties/hand/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
var _valid1 = _errs50 === errors;
valid17 = valid17 || _valid1;
const _errs52 = errors;
if(data20 !== null){
const err48 = {instancePath:instancePath+"/winners/" + i4+"/hand",schemaPath:"#/$defs/WinnerData/properties/hand/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
var _valid1 = _errs52 === errors;
valid17 = valid17 || _valid1;
if(!valid17){
const err49 = {instancePath:instancePath+"/winners/" + i4+"/hand",schemaPath:"#/$defs/WinnerData/properties/hand/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
else {
errors = _errs49;
if(vErrors !== null){
if(_errs49){
vErrors.length = _errs49;
}
else {
vErrors = null;
}
}
}
}
if(data18.seat !== undefined){
let data21 = data18.seat;
if(!(((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21))) && (isFinite(data21)))){
const err50 = {instancePath:instancePath+"/winners/" + i4+"/seat",schemaPath:"#/$defs/WinnerData/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if((typeof data21 == "number") && (isFinite(data21))){
if(data21 < 0 || isNaN(data21)){
const err51 = {instancePath:instancePath+"/winners/" + i4+"/seat",schemaPath:"#/$defs/WinnerData/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
if(data18.user_id !== undefined){
let data22 = data18.user_id;
if(!(((typeof data22 == "number") && (!(data22 % 1) && !isNaN(data22))) && (isFinite(data22)))){
const err52 = {instancePath:instancePath+"/winners/" + i4+"/user_id",schemaPath:"#/$defs/WinnerData/properties/user_id/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if((typeof data22 == "number") && (isFinite(data22))){
if(data22 < 0 || isNaN(data22)){
const err53 = {instancePath:instancePath+"/winners/" + i4+"/user_id",schemaPath:"#/$defs/WinnerData/properties/user_id/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
}
}
else {
const err54 = {instancePath:instancePath+"/winners/" + i4,schemaPath:"#/$defs/WinnerData/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
}
else {
const err55 = {instancePath:instancePath+"/winners",schemaPath:"#/properties/winners/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
}
else {
const err56 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
validate25.errors = vErrors;
return errors === 0;
}
validate25.evaluated = {"props":{"community":true,"pots":true,"rake":true,"revision":true,"schema_version":true,"server_seed":true,"server_time":true,"shown_cards":true,"stream_id":true,"type":true,"winners":true},"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://pokerin.space/schema/ws/server-v1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate21(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = {};
props0.action_on = true;
props0.blinds = true;
props0.community = true;
props0.dealer = true;
props0.hand_num = true;
props0.phase = true;
props0.pots = true;
props0.revision = true;
props0.schema_version = true;
props0.seats = true;
props0.seed_hash = true;
props0.server_time = true;
props0.shown_cards = true;
props0.stream_id = true;
props0.street = true;
props0.table_id = true;
props0.table_name = true;
props0.type = true;
props0.winners = true;
props0.your_cards = true;
}
const _errs2 = errors;
if(!(validate23(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = props0 || {};
props0.dealer = true;
props0.hand_num = true;
props0.pot = true;
props0.revision = true;
props0.schema_version = true;
props0.seats = true;
props0.seed_hash = true;
props0.server_time = true;
props0.stream_id = true;
props0.type = true;
}
}
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err0 = {instancePath,schemaPath:"#/$defs/DealMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.cards === undefined){
const err1 = {instancePath,schemaPath:"#/$defs/DealMessage/required",keyword:"required",params:{missingProperty: "cards"},message:"must have required property '"+"cards"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.schema_version === undefined){
const err2 = {instancePath,schemaPath:"#/$defs/DealMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.revision === undefined){
const err3 = {instancePath,schemaPath:"#/$defs/DealMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.server_time === undefined){
const err4 = {instancePath,schemaPath:"#/$defs/DealMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.type === undefined){
const err5 = {instancePath,schemaPath:"#/$defs/DealMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.cards !== undefined){
let data0 = data.cards;
if(Array.isArray(data0)){
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
let data1 = data0[i0];
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
const err6 = {instancePath:instancePath+"/cards/" + i0,schemaPath:"#/$defs/DealMessage/properties/cards/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/cards/" + i0,schemaPath:"#/$defs/DealMessage/properties/cards/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath:instancePath+"/cards",schemaPath:"#/$defs/DealMessage/properties/cards/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.revision !== undefined){
let data2 = data.revision;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
const err9 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/DealMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 < 0 || isNaN(data2)){
const err10 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/DealMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data3 = data.schema_version;
if(!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))){
const err11 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/DealMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(1 !== data3){
const err12 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/DealMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.server_time !== undefined){
let data4 = data.server_time;
if(typeof data4 === "string"){
if(!(formats0.validate(data4))){
const err13 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/DealMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
else {
const err14 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/DealMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data5 = data.stream_id;
if(typeof data5 === "string"){
if(func1(data5) > 128){
const err15 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/DealMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(func1(data5) < 1){
const err16 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/DealMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/DealMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.type !== undefined){
let data6 = data.type;
if(typeof data6 !== "string"){
const err18 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/DealMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if("deal" !== data6){
const err19 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/DealMessage/properties/type/const",keyword:"const",params:{allowedValue: "deal"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath,schemaPath:"#/$defs/DealMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = props0 || {};
props0.cards = true;
props0.revision = true;
props0.schema_version = true;
props0.server_time = true;
props0.stream_id = true;
props0.type = true;
}
}
const _errs20 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err21 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data.street === undefined){
const err22 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "street"},message:"must have required property '"+"street"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data.cards === undefined){
const err23 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "cards"},message:"must have required property '"+"cards"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data.board === undefined){
const err24 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "board"},message:"must have required property '"+"board"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data.schema_version === undefined){
const err25 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data.revision === undefined){
const err26 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data.server_time === undefined){
const err27 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data.type === undefined){
const err28 = {instancePath,schemaPath:"#/$defs/CommunityMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data.board !== undefined){
let data7 = data.board;
if(Array.isArray(data7)){
const len1 = data7.length;
for(let i1=0; i1<len1; i1++){
let data8 = data7[i1];
if(typeof data8 === "string"){
if(!pattern4.test(data8)){
const err29 = {instancePath:instancePath+"/board/" + i1,schemaPath:"#/$defs/CommunityMessage/properties/board/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
else {
const err30 = {instancePath:instancePath+"/board/" + i1,schemaPath:"#/$defs/CommunityMessage/properties/board/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
else {
const err31 = {instancePath:instancePath+"/board",schemaPath:"#/$defs/CommunityMessage/properties/board/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data.cards !== undefined){
let data9 = data.cards;
if(Array.isArray(data9)){
const len2 = data9.length;
for(let i2=0; i2<len2; i2++){
let data10 = data9[i2];
if(typeof data10 === "string"){
if(!pattern4.test(data10)){
const err32 = {instancePath:instancePath+"/cards/" + i2,schemaPath:"#/$defs/CommunityMessage/properties/cards/items/pattern",keyword:"pattern",params:{pattern: "^[2-9TJQKA][cdhs]$"},message:"must match pattern \""+"^[2-9TJQKA][cdhs]$"+"\""};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
else {
const err33 = {instancePath:instancePath+"/cards/" + i2,schemaPath:"#/$defs/CommunityMessage/properties/cards/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath:instancePath+"/cards",schemaPath:"#/$defs/CommunityMessage/properties/cards/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.revision !== undefined){
let data11 = data.revision;
if(!(((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11))) && (isFinite(data11)))){
const err35 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/CommunityMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if((typeof data11 == "number") && (isFinite(data11))){
if(data11 < 0 || isNaN(data11)){
const err36 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/CommunityMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data12 = data.schema_version;
if(!(((typeof data12 == "number") && (!(data12 % 1) && !isNaN(data12))) && (isFinite(data12)))){
const err37 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/CommunityMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(1 !== data12){
const err38 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/CommunityMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data.server_time !== undefined){
let data13 = data.server_time;
if(typeof data13 === "string"){
if(!(formats0.validate(data13))){
const err39 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/CommunityMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
else {
const err40 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/CommunityMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data14 = data.stream_id;
if(typeof data14 === "string"){
if(func1(data14) > 128){
const err41 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/CommunityMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(func1(data14) < 1){
const err42 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/CommunityMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
else {
const err43 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/CommunityMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data.street !== undefined){
let data15 = data.street;
if(typeof data15 !== "string"){
const err44 = {instancePath:instancePath+"/street",schemaPath:"#/$defs/CommunityMessage/properties/street/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(!(((((data15 === "preflop") || (data15 === "flop")) || (data15 === "turn")) || (data15 === "river")) || (data15 === "showdown"))){
const err45 = {instancePath:instancePath+"/street",schemaPath:"#/$defs/CommunityMessage/properties/street/enum",keyword:"enum",params:{allowedValues: schema40.properties.street.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data.type !== undefined){
let data16 = data.type;
if(typeof data16 !== "string"){
const err46 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/CommunityMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if("community" !== data16){
const err47 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/CommunityMessage/properties/type/const",keyword:"const",params:{allowedValue: "community"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
}
else {
const err48 = {instancePath,schemaPath:"#/$defs/CommunityMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
var _valid0 = _errs20 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = props0 || {};
props0.board = true;
props0.cards = true;
props0.revision = true;
props0.schema_version = true;
props0.server_time = true;
props0.stream_id = true;
props0.street = true;
props0.type = true;
}
}
const _errs43 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err49 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(data.seat === undefined){
const err50 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data.user_id === undefined){
const err51 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "user_id"},message:"must have required property '"+"user_id"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data.action === undefined){
const err52 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "action"},message:"must have required property '"+"action"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data.amount === undefined){
const err53 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "amount"},message:"must have required property '"+"amount"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data.stack === undefined){
const err54 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "stack"},message:"must have required property '"+"stack"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data.pot === undefined){
const err55 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "pot"},message:"must have required property '"+"pot"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data.schema_version === undefined){
const err56 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data.revision === undefined){
const err57 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
if(data.server_time === undefined){
const err58 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
if(data.type === undefined){
const err59 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
if(data.action !== undefined){
let data17 = data.action;
if(typeof data17 !== "string"){
const err60 = {instancePath:instancePath+"/action",schemaPath:"#/$defs/PlayerActionMessage/properties/action/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(!((((((data17 === "fold") || (data17 === "check")) || (data17 === "call")) || (data17 === "bet")) || (data17 === "raise")) || (data17 === "allin"))){
const err61 = {instancePath:instancePath+"/action",schemaPath:"#/$defs/PlayerActionMessage/properties/action/enum",keyword:"enum",params:{allowedValues: schema41.properties.action.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data.action_on !== undefined){
let data18 = data.action_on;
const _errs49 = errors;
let valid13 = false;
const _errs50 = errors;
if(!(((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18))) && (isFinite(data18)))){
const err62 = {instancePath:instancePath+"/action_on",schemaPath:"#/$defs/PlayerActionMessage/properties/action_on/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
var _valid1 = _errs50 === errors;
valid13 = valid13 || _valid1;
const _errs52 = errors;
if(data18 !== null){
const err63 = {instancePath:instancePath+"/action_on",schemaPath:"#/$defs/PlayerActionMessage/properties/action_on/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
var _valid1 = _errs52 === errors;
valid13 = valid13 || _valid1;
if(!valid13){
const err64 = {instancePath:instancePath+"/action_on",schemaPath:"#/$defs/PlayerActionMessage/properties/action_on/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
else {
errors = _errs49;
if(vErrors !== null){
if(_errs49){
vErrors.length = _errs49;
}
else {
vErrors = null;
}
}
}
}
if(data.amount !== undefined){
let data19 = data.amount;
if(!(((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19))) && (isFinite(data19)))){
const err65 = {instancePath:instancePath+"/amount",schemaPath:"#/$defs/PlayerActionMessage/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
if((typeof data19 == "number") && (isFinite(data19))){
if(data19 < 0 || isNaN(data19)){
const err66 = {instancePath:instancePath+"/amount",schemaPath:"#/$defs/PlayerActionMessage/properties/amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
}
if(data.current_bet !== undefined){
let data20 = data.current_bet;
const _errs57 = errors;
let valid14 = false;
const _errs58 = errors;
if(!(((typeof data20 == "number") && (!(data20 % 1) && !isNaN(data20))) && (isFinite(data20)))){
const err67 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/PlayerActionMessage/properties/current_bet/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if((typeof data20 == "number") && (isFinite(data20))){
if(data20 < 0 || isNaN(data20)){
const err68 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/PlayerActionMessage/properties/current_bet/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
var _valid2 = _errs58 === errors;
valid14 = valid14 || _valid2;
const _errs60 = errors;
if(data20 !== null){
const err69 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/PlayerActionMessage/properties/current_bet/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
var _valid2 = _errs60 === errors;
valid14 = valid14 || _valid2;
if(!valid14){
const err70 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/PlayerActionMessage/properties/current_bet/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
else {
errors = _errs57;
if(vErrors !== null){
if(_errs57){
vErrors.length = _errs57;
}
else {
vErrors = null;
}
}
}
}
if(data.pot !== undefined){
let data21 = data.pot;
if(!(((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21))) && (isFinite(data21)))){
const err71 = {instancePath:instancePath+"/pot",schemaPath:"#/$defs/PlayerActionMessage/properties/pot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
if((typeof data21 == "number") && (isFinite(data21))){
if(data21 < 0 || isNaN(data21)){
const err72 = {instancePath:instancePath+"/pot",schemaPath:"#/$defs/PlayerActionMessage/properties/pot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
}
if(data.revision !== undefined){
let data22 = data.revision;
if(!(((typeof data22 == "number") && (!(data22 % 1) && !isNaN(data22))) && (isFinite(data22)))){
const err73 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/PlayerActionMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
if((typeof data22 == "number") && (isFinite(data22))){
if(data22 < 0 || isNaN(data22)){
const err74 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/PlayerActionMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data23 = data.schema_version;
if(!(((typeof data23 == "number") && (!(data23 % 1) && !isNaN(data23))) && (isFinite(data23)))){
const err75 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/PlayerActionMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
if(1 !== data23){
const err76 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/PlayerActionMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
if(data.seat !== undefined){
let data24 = data.seat;
if(!(((typeof data24 == "number") && (!(data24 % 1) && !isNaN(data24))) && (isFinite(data24)))){
const err77 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/PlayerActionMessage/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
if((typeof data24 == "number") && (isFinite(data24))){
if(data24 < 0 || isNaN(data24)){
const err78 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/PlayerActionMessage/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
}
if(data.server_time !== undefined){
let data25 = data.server_time;
if(typeof data25 === "string"){
if(!(formats0.validate(data25))){
const err79 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/PlayerActionMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
else {
const err80 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/PlayerActionMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
if(data.stack !== undefined){
let data26 = data.stack;
if(!(((typeof data26 == "number") && (!(data26 % 1) && !isNaN(data26))) && (isFinite(data26)))){
const err81 = {instancePath:instancePath+"/stack",schemaPath:"#/$defs/PlayerActionMessage/properties/stack/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
if((typeof data26 == "number") && (isFinite(data26))){
if(data26 < 0 || isNaN(data26)){
const err82 = {instancePath:instancePath+"/stack",schemaPath:"#/$defs/PlayerActionMessage/properties/stack/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
}
if(data.status !== undefined){
let data27 = data.status;
const _errs75 = errors;
let valid15 = false;
const _errs76 = errors;
if(typeof data27 !== "string"){
const err83 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/PlayerActionMessage/properties/status/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
if(!(((((data27 === "waiting") || (data27 === "active")) || (data27 === "folded")) || (data27 === "allin")) || (data27 === "sitting_out"))){
const err84 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/PlayerActionMessage/properties/status/anyOf/0/enum",keyword:"enum",params:{allowedValues: schema41.properties.status.anyOf[0].enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
var _valid3 = _errs76 === errors;
valid15 = valid15 || _valid3;
const _errs78 = errors;
if(data27 !== null){
const err85 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/PlayerActionMessage/properties/status/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
var _valid3 = _errs78 === errors;
valid15 = valid15 || _valid3;
if(!valid15){
const err86 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/PlayerActionMessage/properties/status/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
else {
errors = _errs75;
if(vErrors !== null){
if(_errs75){
vErrors.length = _errs75;
}
else {
vErrors = null;
}
}
}
}
if(data.stream_id !== undefined){
let data28 = data.stream_id;
if(typeof data28 === "string"){
if(func1(data28) > 128){
const err87 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/PlayerActionMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
if(func1(data28) < 1){
const err88 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/PlayerActionMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
else {
const err89 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/PlayerActionMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
if(data.type !== undefined){
let data29 = data.type;
if(typeof data29 !== "string"){
const err90 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/PlayerActionMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
if("player_action" !== data29){
const err91 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/PlayerActionMessage/properties/type/const",keyword:"const",params:{allowedValue: "player_action"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
if(data.user_id !== undefined){
let data30 = data.user_id;
if(!(((typeof data30 == "number") && (!(data30 % 1) && !isNaN(data30))) && (isFinite(data30)))){
const err92 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/PlayerActionMessage/properties/user_id/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if((typeof data30 == "number") && (isFinite(data30))){
if(data30 < 0 || isNaN(data30)){
const err93 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/PlayerActionMessage/properties/user_id/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
}
}
}
else {
const err94 = {instancePath,schemaPath:"#/$defs/PlayerActionMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
var _valid0 = _errs43 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = props0 || {};
props0.action = true;
props0.action_on = true;
props0.amount = true;
props0.current_bet = true;
props0.pot = true;
props0.revision = true;
props0.schema_version = true;
props0.seat = true;
props0.server_time = true;
props0.stack = true;
props0.status = true;
props0.stream_id = true;
props0.type = true;
props0.user_id = true;
}
}
const _errs86 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err95 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
if(data.seat === undefined){
const err96 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
if(data.timeout === undefined){
const err97 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "timeout"},message:"must have required property '"+"timeout"+"'"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
if(data.prompt_id === undefined){
const err98 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "prompt_id"},message:"must have required property '"+"prompt_id"+"'"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
if(data.turn_token === undefined){
const err99 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "turn_token"},message:"must have required property '"+"turn_token"+"'"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
if(data.schema_version === undefined){
const err100 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
if(data.revision === undefined){
const err101 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
if(data.server_time === undefined){
const err102 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
if(data.type === undefined){
const err103 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
if(data.prompt_id !== undefined){
let data31 = data.prompt_id;
if(typeof data31 === "string"){
if(func1(data31) > 128){
const err104 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionOnMessage/properties/prompt_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
if(func1(data31) < 1){
const err105 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionOnMessage/properties/prompt_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
else {
const err106 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionOnMessage/properties/prompt_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
}
if(data.revision !== undefined){
let data32 = data.revision;
if(!(((typeof data32 == "number") && (!(data32 % 1) && !isNaN(data32))) && (isFinite(data32)))){
const err107 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ActionOnMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
if((typeof data32 == "number") && (isFinite(data32))){
if(data32 < 0 || isNaN(data32)){
const err108 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ActionOnMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data33 = data.schema_version;
if(!(((typeof data33 == "number") && (!(data33 % 1) && !isNaN(data33))) && (isFinite(data33)))){
const err109 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionOnMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
if(1 !== data33){
const err110 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionOnMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err110];
}
else {
vErrors.push(err110);
}
errors++;
}
}
if(data.seat !== undefined){
let data34 = data.seat;
if(!(((typeof data34 == "number") && (!(data34 % 1) && !isNaN(data34))) && (isFinite(data34)))){
const err111 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/ActionOnMessage/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err111];
}
else {
vErrors.push(err111);
}
errors++;
}
if((typeof data34 == "number") && (isFinite(data34))){
if(data34 < 0 || isNaN(data34)){
const err112 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/ActionOnMessage/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err112];
}
else {
vErrors.push(err112);
}
errors++;
}
}
}
if(data.server_time !== undefined){
let data35 = data.server_time;
if(typeof data35 === "string"){
if(!(formats0.validate(data35))){
const err113 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ActionOnMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err113];
}
else {
vErrors.push(err113);
}
errors++;
}
}
else {
const err114 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ActionOnMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err114];
}
else {
vErrors.push(err114);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data36 = data.stream_id;
if(typeof data36 === "string"){
if(func1(data36) > 128){
const err115 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ActionOnMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err115];
}
else {
vErrors.push(err115);
}
errors++;
}
if(func1(data36) < 1){
const err116 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ActionOnMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err116];
}
else {
vErrors.push(err116);
}
errors++;
}
}
else {
const err117 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ActionOnMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err117];
}
else {
vErrors.push(err117);
}
errors++;
}
}
if(data.timeout !== undefined){
let data37 = data.timeout;
if((typeof data37 == "number") && (isFinite(data37))){
if(data37 < 0 || isNaN(data37)){
const err118 = {instancePath:instancePath+"/timeout",schemaPath:"#/$defs/ActionOnMessage/properties/timeout/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err118];
}
else {
vErrors.push(err118);
}
errors++;
}
}
else {
const err119 = {instancePath:instancePath+"/timeout",schemaPath:"#/$defs/ActionOnMessage/properties/timeout/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err119];
}
else {
vErrors.push(err119);
}
errors++;
}
}
if(data.turn_token !== undefined){
let data38 = data.turn_token;
if(typeof data38 === "string"){
if(func1(data38) > 128){
const err120 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionOnMessage/properties/turn_token/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err120];
}
else {
vErrors.push(err120);
}
errors++;
}
if(func1(data38) < 1){
const err121 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionOnMessage/properties/turn_token/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err121];
}
else {
vErrors.push(err121);
}
errors++;
}
}
else {
const err122 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionOnMessage/properties/turn_token/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err122];
}
else {
vErrors.push(err122);
}
errors++;
}
}
if(data.type !== undefined){
let data39 = data.type;
if(typeof data39 !== "string"){
const err123 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ActionOnMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err123];
}
else {
vErrors.push(err123);
}
errors++;
}
if("action_on" !== data39){
const err124 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ActionOnMessage/properties/type/const",keyword:"const",params:{allowedValue: "action_on"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err124];
}
else {
vErrors.push(err124);
}
errors++;
}
}
}
else {
const err125 = {instancePath,schemaPath:"#/$defs/ActionOnMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err125];
}
else {
vErrors.push(err125);
}
errors++;
}
var _valid0 = _errs86 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = props0 || {};
props0.prompt_id = true;
props0.revision = true;
props0.schema_version = true;
props0.seat = true;
props0.server_time = true;
props0.stream_id = true;
props0.timeout = true;
props0.turn_token = true;
props0.type = true;
}
}
const _errs107 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err126 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err126];
}
else {
vErrors.push(err126);
}
errors++;
}
if(data.valid === undefined){
const err127 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "valid"},message:"must have required property '"+"valid"+"'"};
if(vErrors === null){
vErrors = [err127];
}
else {
vErrors.push(err127);
}
errors++;
}
if(data.call_amount === undefined){
const err128 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "call_amount"},message:"must have required property '"+"call_amount"+"'"};
if(vErrors === null){
vErrors = [err128];
}
else {
vErrors.push(err128);
}
errors++;
}
if(data.min_raise === undefined){
const err129 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "min_raise"},message:"must have required property '"+"min_raise"+"'"};
if(vErrors === null){
vErrors = [err129];
}
else {
vErrors.push(err129);
}
errors++;
}
if(data.max_raise === undefined){
const err130 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "max_raise"},message:"must have required property '"+"max_raise"+"'"};
if(vErrors === null){
vErrors = [err130];
}
else {
vErrors.push(err130);
}
errors++;
}
if(data.timeout === undefined){
const err131 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "timeout"},message:"must have required property '"+"timeout"+"'"};
if(vErrors === null){
vErrors = [err131];
}
else {
vErrors.push(err131);
}
errors++;
}
if(data.prompt_id === undefined){
const err132 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "prompt_id"},message:"must have required property '"+"prompt_id"+"'"};
if(vErrors === null){
vErrors = [err132];
}
else {
vErrors.push(err132);
}
errors++;
}
if(data.turn_token === undefined){
const err133 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "turn_token"},message:"must have required property '"+"turn_token"+"'"};
if(vErrors === null){
vErrors = [err133];
}
else {
vErrors.push(err133);
}
errors++;
}
if(data.schema_version === undefined){
const err134 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err134];
}
else {
vErrors.push(err134);
}
errors++;
}
if(data.revision === undefined){
const err135 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err135];
}
else {
vErrors.push(err135);
}
errors++;
}
if(data.server_time === undefined){
const err136 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err136];
}
else {
vErrors.push(err136);
}
errors++;
}
if(data.type === undefined){
const err137 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err137];
}
else {
vErrors.push(err137);
}
errors++;
}
if(data.call_amount !== undefined){
let data40 = data.call_amount;
if(!(((typeof data40 == "number") && (!(data40 % 1) && !isNaN(data40))) && (isFinite(data40)))){
const err138 = {instancePath:instancePath+"/call_amount",schemaPath:"#/$defs/ActionPromptMessage/properties/call_amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err138];
}
else {
vErrors.push(err138);
}
errors++;
}
if((typeof data40 == "number") && (isFinite(data40))){
if(data40 < 0 || isNaN(data40)){
const err139 = {instancePath:instancePath+"/call_amount",schemaPath:"#/$defs/ActionPromptMessage/properties/call_amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err139];
}
else {
vErrors.push(err139);
}
errors++;
}
}
}
if(data.max_raise !== undefined){
let data41 = data.max_raise;
if(!(((typeof data41 == "number") && (!(data41 % 1) && !isNaN(data41))) && (isFinite(data41)))){
const err140 = {instancePath:instancePath+"/max_raise",schemaPath:"#/$defs/ActionPromptMessage/properties/max_raise/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err140];
}
else {
vErrors.push(err140);
}
errors++;
}
if((typeof data41 == "number") && (isFinite(data41))){
if(data41 < 0 || isNaN(data41)){
const err141 = {instancePath:instancePath+"/max_raise",schemaPath:"#/$defs/ActionPromptMessage/properties/max_raise/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err141];
}
else {
vErrors.push(err141);
}
errors++;
}
}
}
if(data.min_raise !== undefined){
let data42 = data.min_raise;
if(!(((typeof data42 == "number") && (!(data42 % 1) && !isNaN(data42))) && (isFinite(data42)))){
const err142 = {instancePath:instancePath+"/min_raise",schemaPath:"#/$defs/ActionPromptMessage/properties/min_raise/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err142];
}
else {
vErrors.push(err142);
}
errors++;
}
if((typeof data42 == "number") && (isFinite(data42))){
if(data42 < 0 || isNaN(data42)){
const err143 = {instancePath:instancePath+"/min_raise",schemaPath:"#/$defs/ActionPromptMessage/properties/min_raise/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err143];
}
else {
vErrors.push(err143);
}
errors++;
}
}
}
if(data.prompt_id !== undefined){
let data43 = data.prompt_id;
if(typeof data43 === "string"){
if(func1(data43) > 128){
const err144 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionPromptMessage/properties/prompt_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err144];
}
else {
vErrors.push(err144);
}
errors++;
}
if(func1(data43) < 1){
const err145 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionPromptMessage/properties/prompt_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err145];
}
else {
vErrors.push(err145);
}
errors++;
}
}
else {
const err146 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionPromptMessage/properties/prompt_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err146];
}
else {
vErrors.push(err146);
}
errors++;
}
}
if(data.revision !== undefined){
let data44 = data.revision;
if(!(((typeof data44 == "number") && (!(data44 % 1) && !isNaN(data44))) && (isFinite(data44)))){
const err147 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ActionPromptMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err147];
}
else {
vErrors.push(err147);
}
errors++;
}
if((typeof data44 == "number") && (isFinite(data44))){
if(data44 < 0 || isNaN(data44)){
const err148 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ActionPromptMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err148];
}
else {
vErrors.push(err148);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data45 = data.schema_version;
if(!(((typeof data45 == "number") && (!(data45 % 1) && !isNaN(data45))) && (isFinite(data45)))){
const err149 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionPromptMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err149];
}
else {
vErrors.push(err149);
}
errors++;
}
if(1 !== data45){
const err150 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionPromptMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err150];
}
else {
vErrors.push(err150);
}
errors++;
}
}
if(data.server_time !== undefined){
let data46 = data.server_time;
if(typeof data46 === "string"){
if(!(formats0.validate(data46))){
const err151 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ActionPromptMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err151];
}
else {
vErrors.push(err151);
}
errors++;
}
}
else {
const err152 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ActionPromptMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err152];
}
else {
vErrors.push(err152);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data47 = data.stream_id;
if(typeof data47 === "string"){
if(func1(data47) > 128){
const err153 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ActionPromptMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err153];
}
else {
vErrors.push(err153);
}
errors++;
}
if(func1(data47) < 1){
const err154 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ActionPromptMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err154];
}
else {
vErrors.push(err154);
}
errors++;
}
}
else {
const err155 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ActionPromptMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err155];
}
else {
vErrors.push(err155);
}
errors++;
}
}
if(data.timeout !== undefined){
let data48 = data.timeout;
if((typeof data48 == "number") && (isFinite(data48))){
if(data48 < 0 || isNaN(data48)){
const err156 = {instancePath:instancePath+"/timeout",schemaPath:"#/$defs/ActionPromptMessage/properties/timeout/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err156];
}
else {
vErrors.push(err156);
}
errors++;
}
}
else {
const err157 = {instancePath:instancePath+"/timeout",schemaPath:"#/$defs/ActionPromptMessage/properties/timeout/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err157];
}
else {
vErrors.push(err157);
}
errors++;
}
}
if(data.turn_token !== undefined){
let data49 = data.turn_token;
if(typeof data49 === "string"){
if(func1(data49) > 128){
const err158 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionPromptMessage/properties/turn_token/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err158];
}
else {
vErrors.push(err158);
}
errors++;
}
if(func1(data49) < 1){
const err159 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionPromptMessage/properties/turn_token/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err159];
}
else {
vErrors.push(err159);
}
errors++;
}
}
else {
const err160 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionPromptMessage/properties/turn_token/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err160];
}
else {
vErrors.push(err160);
}
errors++;
}
}
if(data.type !== undefined){
let data50 = data.type;
if(typeof data50 !== "string"){
const err161 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ActionPromptMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err161];
}
else {
vErrors.push(err161);
}
errors++;
}
if("action_prompt" !== data50){
const err162 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ActionPromptMessage/properties/type/const",keyword:"const",params:{allowedValue: "action_prompt"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err162];
}
else {
vErrors.push(err162);
}
errors++;
}
}
if(data.valid !== undefined){
let data51 = data.valid;
if(Array.isArray(data51)){
const len3 = data51.length;
for(let i3=0; i3<len3; i3++){
let data52 = data51[i3];
if(typeof data52 !== "string"){
const err163 = {instancePath:instancePath+"/valid/" + i3,schemaPath:"#/$defs/ActionPromptMessage/properties/valid/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err163];
}
else {
vErrors.push(err163);
}
errors++;
}
if(!((((((data52 === "fold") || (data52 === "check")) || (data52 === "call")) || (data52 === "bet")) || (data52 === "raise")) || (data52 === "allin"))){
const err164 = {instancePath:instancePath+"/valid/" + i3,schemaPath:"#/$defs/ActionPromptMessage/properties/valid/items/enum",keyword:"enum",params:{allowedValues: schema43.properties.valid.items.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err164];
}
else {
vErrors.push(err164);
}
errors++;
}
}
}
else {
const err165 = {instancePath:instancePath+"/valid",schemaPath:"#/$defs/ActionPromptMessage/properties/valid/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err165];
}
else {
vErrors.push(err165);
}
errors++;
}
}
}
else {
const err166 = {instancePath,schemaPath:"#/$defs/ActionPromptMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err166];
}
else {
vErrors.push(err166);
}
errors++;
}
var _valid0 = _errs107 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = props0 || {};
props0.call_amount = true;
props0.max_raise = true;
props0.min_raise = true;
props0.prompt_id = true;
props0.revision = true;
props0.schema_version = true;
props0.server_time = true;
props0.stream_id = true;
props0.timeout = true;
props0.turn_token = true;
props0.type = true;
props0.valid = true;
}
}
const _errs136 = errors;
if(!(validate25(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
errors = vErrors.length;
}
var _valid0 = _errs136 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props0 !== true){
props0 = props0 || {};
props0.community = true;
props0.pots = true;
props0.rake = true;
props0.revision = true;
props0.schema_version = true;
props0.server_seed = true;
props0.server_time = true;
props0.shown_cards = true;
props0.stream_id = true;
props0.type = true;
props0.winners = true;
}
}
const _errs137 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.seat === undefined){
const err167 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err167];
}
else {
vErrors.push(err167);
}
errors++;
}
if(data.status === undefined){
const err168 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err168];
}
else {
vErrors.push(err168);
}
errors++;
}
if(data.stream_id === undefined){
const err169 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err169];
}
else {
vErrors.push(err169);
}
errors++;
}
if(data.schema_version === undefined){
const err170 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err170];
}
else {
vErrors.push(err170);
}
errors++;
}
if(data.revision === undefined){
const err171 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err171];
}
else {
vErrors.push(err171);
}
errors++;
}
if(data.server_time === undefined){
const err172 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err172];
}
else {
vErrors.push(err172);
}
errors++;
}
if(data.type === undefined){
const err173 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err173];
}
else {
vErrors.push(err173);
}
errors++;
}
if(data.current_bet !== undefined){
let data53 = data.current_bet;
const _errs141 = errors;
let valid24 = false;
const _errs142 = errors;
if(!(((typeof data53 == "number") && (!(data53 % 1) && !isNaN(data53))) && (isFinite(data53)))){
const err174 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/SeatUpdateMessage/properties/current_bet/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err174];
}
else {
vErrors.push(err174);
}
errors++;
}
if((typeof data53 == "number") && (isFinite(data53))){
if(data53 < 0 || isNaN(data53)){
const err175 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/SeatUpdateMessage/properties/current_bet/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err175];
}
else {
vErrors.push(err175);
}
errors++;
}
}
var _valid4 = _errs142 === errors;
valid24 = valid24 || _valid4;
const _errs144 = errors;
if(data53 !== null){
const err176 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/SeatUpdateMessage/properties/current_bet/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err176];
}
else {
vErrors.push(err176);
}
errors++;
}
var _valid4 = _errs144 === errors;
valid24 = valid24 || _valid4;
if(!valid24){
const err177 = {instancePath:instancePath+"/current_bet",schemaPath:"#/$defs/SeatUpdateMessage/properties/current_bet/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err177];
}
else {
vErrors.push(err177);
}
errors++;
}
else {
errors = _errs141;
if(vErrors !== null){
if(_errs141){
vErrors.length = _errs141;
}
else {
vErrors = null;
}
}
}
}
if(data.name !== undefined){
let data54 = data.name;
const _errs147 = errors;
let valid25 = false;
const _errs148 = errors;
if(typeof data54 !== "string"){
const err178 = {instancePath:instancePath+"/name",schemaPath:"#/$defs/SeatUpdateMessage/properties/name/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err178];
}
else {
vErrors.push(err178);
}
errors++;
}
var _valid5 = _errs148 === errors;
valid25 = valid25 || _valid5;
const _errs150 = errors;
if(data54 !== null){
const err179 = {instancePath:instancePath+"/name",schemaPath:"#/$defs/SeatUpdateMessage/properties/name/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err179];
}
else {
vErrors.push(err179);
}
errors++;
}
var _valid5 = _errs150 === errors;
valid25 = valid25 || _valid5;
if(!valid25){
const err180 = {instancePath:instancePath+"/name",schemaPath:"#/$defs/SeatUpdateMessage/properties/name/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err180];
}
else {
vErrors.push(err180);
}
errors++;
}
else {
errors = _errs147;
if(vErrors !== null){
if(_errs147){
vErrors.length = _errs147;
}
else {
vErrors = null;
}
}
}
}
if(data.portrait !== undefined){
let data55 = data.portrait;
const _errs153 = errors;
let valid26 = false;
const _errs154 = errors;
if(typeof data55 !== "string"){
const err181 = {instancePath:instancePath+"/portrait",schemaPath:"#/$defs/SeatUpdateMessage/properties/portrait/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err181];
}
else {
vErrors.push(err181);
}
errors++;
}
var _valid6 = _errs154 === errors;
valid26 = valid26 || _valid6;
const _errs156 = errors;
if(data55 !== null){
const err182 = {instancePath:instancePath+"/portrait",schemaPath:"#/$defs/SeatUpdateMessage/properties/portrait/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err182];
}
else {
vErrors.push(err182);
}
errors++;
}
var _valid6 = _errs156 === errors;
valid26 = valid26 || _valid6;
if(!valid26){
const err183 = {instancePath:instancePath+"/portrait",schemaPath:"#/$defs/SeatUpdateMessage/properties/portrait/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err183];
}
else {
vErrors.push(err183);
}
errors++;
}
else {
errors = _errs153;
if(vErrors !== null){
if(_errs153){
vErrors.length = _errs153;
}
else {
vErrors = null;
}
}
}
}
if(data.revision !== undefined){
let data56 = data.revision;
if(!(((typeof data56 == "number") && (!(data56 % 1) && !isNaN(data56))) && (isFinite(data56)))){
const err184 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/SeatUpdateMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err184];
}
else {
vErrors.push(err184);
}
errors++;
}
if((typeof data56 == "number") && (isFinite(data56))){
if(data56 < 0 || isNaN(data56)){
const err185 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/SeatUpdateMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err185];
}
else {
vErrors.push(err185);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data57 = data.schema_version;
if(!(((typeof data57 == "number") && (!(data57 % 1) && !isNaN(data57))) && (isFinite(data57)))){
const err186 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/SeatUpdateMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err186];
}
else {
vErrors.push(err186);
}
errors++;
}
if(1 !== data57){
const err187 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/SeatUpdateMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err187];
}
else {
vErrors.push(err187);
}
errors++;
}
}
if(data.seat !== undefined){
let data58 = data.seat;
if(!(((typeof data58 == "number") && (!(data58 % 1) && !isNaN(data58))) && (isFinite(data58)))){
const err188 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/SeatUpdateMessage/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err188];
}
else {
vErrors.push(err188);
}
errors++;
}
if((typeof data58 == "number") && (isFinite(data58))){
if(data58 < 0 || isNaN(data58)){
const err189 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/SeatUpdateMessage/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err189];
}
else {
vErrors.push(err189);
}
errors++;
}
}
}
if(data.server_time !== undefined){
let data59 = data.server_time;
if(typeof data59 === "string"){
if(!(formats0.validate(data59))){
const err190 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/SeatUpdateMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err190];
}
else {
vErrors.push(err190);
}
errors++;
}
}
else {
const err191 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/SeatUpdateMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err191];
}
else {
vErrors.push(err191);
}
errors++;
}
}
if(data.stack !== undefined){
let data60 = data.stack;
const _errs167 = errors;
let valid27 = false;
const _errs168 = errors;
if(!(((typeof data60 == "number") && (!(data60 % 1) && !isNaN(data60))) && (isFinite(data60)))){
const err192 = {instancePath:instancePath+"/stack",schemaPath:"#/$defs/SeatUpdateMessage/properties/stack/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err192];
}
else {
vErrors.push(err192);
}
errors++;
}
if((typeof data60 == "number") && (isFinite(data60))){
if(data60 < 0 || isNaN(data60)){
const err193 = {instancePath:instancePath+"/stack",schemaPath:"#/$defs/SeatUpdateMessage/properties/stack/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err193];
}
else {
vErrors.push(err193);
}
errors++;
}
}
var _valid7 = _errs168 === errors;
valid27 = valid27 || _valid7;
const _errs170 = errors;
if(data60 !== null){
const err194 = {instancePath:instancePath+"/stack",schemaPath:"#/$defs/SeatUpdateMessage/properties/stack/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err194];
}
else {
vErrors.push(err194);
}
errors++;
}
var _valid7 = _errs170 === errors;
valid27 = valid27 || _valid7;
if(!valid27){
const err195 = {instancePath:instancePath+"/stack",schemaPath:"#/$defs/SeatUpdateMessage/properties/stack/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err195];
}
else {
vErrors.push(err195);
}
errors++;
}
else {
errors = _errs167;
if(vErrors !== null){
if(_errs167){
vErrors.length = _errs167;
}
else {
vErrors = null;
}
}
}
}
if(data.status !== undefined){
let data61 = data.status;
if(typeof data61 !== "string"){
const err196 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/SeatUpdateMessage/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err196];
}
else {
vErrors.push(err196);
}
errors++;
}
if(!((((((data61 === "empty") || (data61 === "waiting")) || (data61 === "active")) || (data61 === "folded")) || (data61 === "allin")) || (data61 === "sitting_out"))){
const err197 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/SeatUpdateMessage/properties/status/enum",keyword:"enum",params:{allowedValues: schema47.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err197];
}
else {
vErrors.push(err197);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data62 = data.stream_id;
if(typeof data62 === "string"){
if(func1(data62) > 128){
const err198 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err198];
}
else {
vErrors.push(err198);
}
errors++;
}
if(func1(data62) < 1){
const err199 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err199];
}
else {
vErrors.push(err199);
}
errors++;
}
}
else {
const err200 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err200];
}
else {
vErrors.push(err200);
}
errors++;
}
}
if(data.type !== undefined){
let data63 = data.type;
if(typeof data63 !== "string"){
const err201 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/SeatUpdateMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err201];
}
else {
vErrors.push(err201);
}
errors++;
}
if("seat_update" !== data63){
const err202 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/SeatUpdateMessage/properties/type/const",keyword:"const",params:{allowedValue: "seat_update"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err202];
}
else {
vErrors.push(err202);
}
errors++;
}
}
if(data.user_id !== undefined){
let data64 = data.user_id;
const _errs179 = errors;
let valid28 = false;
const _errs180 = errors;
if(!(((typeof data64 == "number") && (!(data64 % 1) && !isNaN(data64))) && (isFinite(data64)))){
const err203 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/user_id/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err203];
}
else {
vErrors.push(err203);
}
errors++;
}
if((typeof data64 == "number") && (isFinite(data64))){
if(data64 < 0 || isNaN(data64)){
const err204 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/user_id/anyOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err204];
}
else {
vErrors.push(err204);
}
errors++;
}
}
var _valid8 = _errs180 === errors;
valid28 = valid28 || _valid8;
const _errs182 = errors;
if(data64 !== null){
const err205 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/user_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err205];
}
else {
vErrors.push(err205);
}
errors++;
}
var _valid8 = _errs182 === errors;
valid28 = valid28 || _valid8;
if(!valid28){
const err206 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/SeatUpdateMessage/properties/user_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err206];
}
else {
vErrors.push(err206);
}
errors++;
}
else {
errors = _errs179;
if(vErrors !== null){
if(_errs179){
vErrors.length = _errs179;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err207 = {instancePath,schemaPath:"#/$defs/SeatUpdateMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err207];
}
else {
vErrors.push(err207);
}
errors++;
}
var _valid0 = _errs137 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 8];
}
else {
if(_valid0){
valid0 = true;
passing0 = 8;
if(props0 !== true){
props0 = props0 || {};
props0.current_bet = true;
props0.name = true;
props0.portrait = true;
props0.revision = true;
props0.schema_version = true;
props0.seat = true;
props0.server_time = true;
props0.stack = true;
props0.status = true;
props0.stream_id = true;
props0.type = true;
props0.user_id = true;
}
}
const _errs184 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err208 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err208];
}
else {
vErrors.push(err208);
}
errors++;
}
if(data.seat === undefined){
const err209 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err209];
}
else {
vErrors.push(err209);
}
errors++;
}
if(data.user_id === undefined){
const err210 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "user_id"},message:"must have required property '"+"user_id"+"'"};
if(vErrors === null){
vErrors = [err210];
}
else {
vErrors.push(err210);
}
errors++;
}
if(data.duration === undefined){
const err211 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "duration"},message:"must have required property '"+"duration"+"'"};
if(vErrors === null){
vErrors = [err211];
}
else {
vErrors.push(err211);
}
errors++;
}
if(data.schema_version === undefined){
const err212 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err212];
}
else {
vErrors.push(err212);
}
errors++;
}
if(data.revision === undefined){
const err213 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err213];
}
else {
vErrors.push(err213);
}
errors++;
}
if(data.server_time === undefined){
const err214 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err214];
}
else {
vErrors.push(err214);
}
errors++;
}
if(data.type === undefined){
const err215 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err215];
}
else {
vErrors.push(err215);
}
errors++;
}
if(data.duration !== undefined){
let data65 = data.duration;
if((typeof data65 == "number") && (isFinite(data65))){
if(data65 < 0 || isNaN(data65)){
const err216 = {instancePath:instancePath+"/duration",schemaPath:"#/$defs/BankTimeStartMessage/properties/duration/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err216];
}
else {
vErrors.push(err216);
}
errors++;
}
}
else {
const err217 = {instancePath:instancePath+"/duration",schemaPath:"#/$defs/BankTimeStartMessage/properties/duration/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err217];
}
else {
vErrors.push(err217);
}
errors++;
}
}
if(data.revision !== undefined){
let data66 = data.revision;
if(!(((typeof data66 == "number") && (!(data66 % 1) && !isNaN(data66))) && (isFinite(data66)))){
const err218 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/BankTimeStartMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err218];
}
else {
vErrors.push(err218);
}
errors++;
}
if((typeof data66 == "number") && (isFinite(data66))){
if(data66 < 0 || isNaN(data66)){
const err219 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/BankTimeStartMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err219];
}
else {
vErrors.push(err219);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data67 = data.schema_version;
if(!(((typeof data67 == "number") && (!(data67 % 1) && !isNaN(data67))) && (isFinite(data67)))){
const err220 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/BankTimeStartMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err220];
}
else {
vErrors.push(err220);
}
errors++;
}
if(1 !== data67){
const err221 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/BankTimeStartMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err221];
}
else {
vErrors.push(err221);
}
errors++;
}
}
if(data.seat !== undefined){
let data68 = data.seat;
if(!(((typeof data68 == "number") && (!(data68 % 1) && !isNaN(data68))) && (isFinite(data68)))){
const err222 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/BankTimeStartMessage/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err222];
}
else {
vErrors.push(err222);
}
errors++;
}
if((typeof data68 == "number") && (isFinite(data68))){
if(data68 < 0 || isNaN(data68)){
const err223 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/BankTimeStartMessage/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err223];
}
else {
vErrors.push(err223);
}
errors++;
}
}
}
if(data.server_time !== undefined){
let data69 = data.server_time;
if(typeof data69 === "string"){
if(!(formats0.validate(data69))){
const err224 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/BankTimeStartMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err224];
}
else {
vErrors.push(err224);
}
errors++;
}
}
else {
const err225 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/BankTimeStartMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err225];
}
else {
vErrors.push(err225);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data70 = data.stream_id;
if(typeof data70 === "string"){
if(func1(data70) > 128){
const err226 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/BankTimeStartMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err226];
}
else {
vErrors.push(err226);
}
errors++;
}
if(func1(data70) < 1){
const err227 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/BankTimeStartMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err227];
}
else {
vErrors.push(err227);
}
errors++;
}
}
else {
const err228 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/BankTimeStartMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err228];
}
else {
vErrors.push(err228);
}
errors++;
}
}
if(data.type !== undefined){
let data71 = data.type;
if(typeof data71 !== "string"){
const err229 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/BankTimeStartMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err229];
}
else {
vErrors.push(err229);
}
errors++;
}
if("bank_time_start" !== data71){
const err230 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/BankTimeStartMessage/properties/type/const",keyword:"const",params:{allowedValue: "bank_time_start"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err230];
}
else {
vErrors.push(err230);
}
errors++;
}
}
if(data.user_id !== undefined){
let data72 = data.user_id;
if(!(((typeof data72 == "number") && (!(data72 % 1) && !isNaN(data72))) && (isFinite(data72)))){
const err231 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/BankTimeStartMessage/properties/user_id/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err231];
}
else {
vErrors.push(err231);
}
errors++;
}
if((typeof data72 == "number") && (isFinite(data72))){
if(data72 < 0 || isNaN(data72)){
const err232 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/BankTimeStartMessage/properties/user_id/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err232];
}
else {
vErrors.push(err232);
}
errors++;
}
}
}
}
else {
const err233 = {instancePath,schemaPath:"#/$defs/BankTimeStartMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err233];
}
else {
vErrors.push(err233);
}
errors++;
}
var _valid0 = _errs184 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 9];
}
else {
if(_valid0){
valid0 = true;
passing0 = 9;
if(props0 !== true){
props0 = props0 || {};
props0.duration = true;
props0.revision = true;
props0.schema_version = true;
props0.seat = true;
props0.server_time = true;
props0.stream_id = true;
props0.type = true;
props0.user_id = true;
}
}
const _errs203 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err234 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err234];
}
else {
vErrors.push(err234);
}
errors++;
}
if(data.user_id === undefined){
const err235 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "user_id"},message:"must have required property '"+"user_id"+"'"};
if(vErrors === null){
vErrors = [err235];
}
else {
vErrors.push(err235);
}
errors++;
}
if(data.name === undefined){
const err236 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err236];
}
else {
vErrors.push(err236);
}
errors++;
}
if(data.text === undefined){
const err237 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err237];
}
else {
vErrors.push(err237);
}
errors++;
}
if(data.schema_version === undefined){
const err238 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err238];
}
else {
vErrors.push(err238);
}
errors++;
}
if(data.revision === undefined){
const err239 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err239];
}
else {
vErrors.push(err239);
}
errors++;
}
if(data.server_time === undefined){
const err240 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err240];
}
else {
vErrors.push(err240);
}
errors++;
}
if(data.type === undefined){
const err241 = {instancePath,schemaPath:"#/$defs/ChatMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err241];
}
else {
vErrors.push(err241);
}
errors++;
}
if(data.name !== undefined){
if(typeof data.name !== "string"){
const err242 = {instancePath:instancePath+"/name",schemaPath:"#/$defs/ChatMessage/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err242];
}
else {
vErrors.push(err242);
}
errors++;
}
}
if(data.revision !== undefined){
let data74 = data.revision;
if(!(((typeof data74 == "number") && (!(data74 % 1) && !isNaN(data74))) && (isFinite(data74)))){
const err243 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ChatMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err243];
}
else {
vErrors.push(err243);
}
errors++;
}
if((typeof data74 == "number") && (isFinite(data74))){
if(data74 < 0 || isNaN(data74)){
const err244 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ChatMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err244];
}
else {
vErrors.push(err244);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data75 = data.schema_version;
if(!(((typeof data75 == "number") && (!(data75 % 1) && !isNaN(data75))) && (isFinite(data75)))){
const err245 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ChatMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err245];
}
else {
vErrors.push(err245);
}
errors++;
}
if(1 !== data75){
const err246 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ChatMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err246];
}
else {
vErrors.push(err246);
}
errors++;
}
}
if(data.server_time !== undefined){
let data76 = data.server_time;
if(typeof data76 === "string"){
if(!(formats0.validate(data76))){
const err247 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ChatMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err247];
}
else {
vErrors.push(err247);
}
errors++;
}
}
else {
const err248 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ChatMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err248];
}
else {
vErrors.push(err248);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data77 = data.stream_id;
if(typeof data77 === "string"){
if(func1(data77) > 128){
const err249 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ChatMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err249];
}
else {
vErrors.push(err249);
}
errors++;
}
if(func1(data77) < 1){
const err250 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ChatMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err250];
}
else {
vErrors.push(err250);
}
errors++;
}
}
else {
const err251 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ChatMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err251];
}
else {
vErrors.push(err251);
}
errors++;
}
}
if(data.text !== undefined){
let data78 = data.text;
if(typeof data78 === "string"){
if(func1(data78) > 200){
const err252 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/ChatMessage/properties/text/maxLength",keyword:"maxLength",params:{limit: 200},message:"must NOT have more than 200 characters"};
if(vErrors === null){
vErrors = [err252];
}
else {
vErrors.push(err252);
}
errors++;
}
if(func1(data78) < 1){
const err253 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/ChatMessage/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err253];
}
else {
vErrors.push(err253);
}
errors++;
}
}
else {
const err254 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/ChatMessage/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err254];
}
else {
vErrors.push(err254);
}
errors++;
}
}
if(data.type !== undefined){
let data79 = data.type;
if(typeof data79 !== "string"){
const err255 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ChatMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err255];
}
else {
vErrors.push(err255);
}
errors++;
}
if("chat" !== data79){
const err256 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ChatMessage/properties/type/const",keyword:"const",params:{allowedValue: "chat"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err256];
}
else {
vErrors.push(err256);
}
errors++;
}
}
if(data.user_id !== undefined){
let data80 = data.user_id;
if(!(((typeof data80 == "number") && (!(data80 % 1) && !isNaN(data80))) && (isFinite(data80)))){
const err257 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/ChatMessage/properties/user_id/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err257];
}
else {
vErrors.push(err257);
}
errors++;
}
if((typeof data80 == "number") && (isFinite(data80))){
if(data80 < 0 || isNaN(data80)){
const err258 = {instancePath:instancePath+"/user_id",schemaPath:"#/$defs/ChatMessage/properties/user_id/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err258];
}
else {
vErrors.push(err258);
}
errors++;
}
}
}
}
else {
const err259 = {instancePath,schemaPath:"#/$defs/ChatMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err259];
}
else {
vErrors.push(err259);
}
errors++;
}
var _valid0 = _errs203 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 10];
}
else {
if(_valid0){
valid0 = true;
passing0 = 10;
if(props0 !== true){
props0 = props0 || {};
props0.name = true;
props0.revision = true;
props0.schema_version = true;
props0.server_time = true;
props0.stream_id = true;
props0.text = true;
props0.type = true;
props0.user_id = true;
}
}
const _errs222 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err260 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err260];
}
else {
vErrors.push(err260);
}
errors++;
}
if(data.command_id === undefined){
const err261 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "command_id"},message:"must have required property '"+"command_id"+"'"};
if(vErrors === null){
vErrors = [err261];
}
else {
vErrors.push(err261);
}
errors++;
}
if(data.command_type === undefined){
const err262 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "command_type"},message:"must have required property '"+"command_type"+"'"};
if(vErrors === null){
vErrors = [err262];
}
else {
vErrors.push(err262);
}
errors++;
}
if(data.status === undefined){
const err263 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err263];
}
else {
vErrors.push(err263);
}
errors++;
}
if(data.schema_version === undefined){
const err264 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err264];
}
else {
vErrors.push(err264);
}
errors++;
}
if(data.revision === undefined){
const err265 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err265];
}
else {
vErrors.push(err265);
}
errors++;
}
if(data.server_time === undefined){
const err266 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err266];
}
else {
vErrors.push(err266);
}
errors++;
}
if(data.type === undefined){
const err267 = {instancePath,schemaPath:"#/$defs/AckMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err267];
}
else {
vErrors.push(err267);
}
errors++;
}
if(data.command_id !== undefined){
let data81 = data.command_id;
if(typeof data81 === "string"){
if(func1(data81) > 128){
const err268 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AckMessage/properties/command_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err268];
}
else {
vErrors.push(err268);
}
errors++;
}
if(func1(data81) < 1){
const err269 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AckMessage/properties/command_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err269];
}
else {
vErrors.push(err269);
}
errors++;
}
}
else {
const err270 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AckMessage/properties/command_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err270];
}
else {
vErrors.push(err270);
}
errors++;
}
}
if(data.command_type !== undefined){
let data82 = data.command_type;
if(typeof data82 !== "string"){
const err271 = {instancePath:instancePath+"/command_type",schemaPath:"#/$defs/AckMessage/properties/command_type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err271];
}
else {
vErrors.push(err271);
}
errors++;
}
if(!(((((data82 === "sit") || (data82 === "stand")) || (data82 === "action")) || (data82 === "add_chips")) || (data82 === "chat"))){
const err272 = {instancePath:instancePath+"/command_type",schemaPath:"#/$defs/AckMessage/properties/command_type/enum",keyword:"enum",params:{allowedValues: schema50.properties.command_type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err272];
}
else {
vErrors.push(err272);
}
errors++;
}
}
if(data.revision !== undefined){
let data83 = data.revision;
if(!(((typeof data83 == "number") && (!(data83 % 1) && !isNaN(data83))) && (isFinite(data83)))){
const err273 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/AckMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err273];
}
else {
vErrors.push(err273);
}
errors++;
}
if((typeof data83 == "number") && (isFinite(data83))){
if(data83 < 0 || isNaN(data83)){
const err274 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/AckMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err274];
}
else {
vErrors.push(err274);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data84 = data.schema_version;
if(!(((typeof data84 == "number") && (!(data84 % 1) && !isNaN(data84))) && (isFinite(data84)))){
const err275 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AckMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err275];
}
else {
vErrors.push(err275);
}
errors++;
}
if(1 !== data84){
const err276 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AckMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err276];
}
else {
vErrors.push(err276);
}
errors++;
}
}
if(data.server_time !== undefined){
let data85 = data.server_time;
if(typeof data85 === "string"){
if(!(formats0.validate(data85))){
const err277 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/AckMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err277];
}
else {
vErrors.push(err277);
}
errors++;
}
}
else {
const err278 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/AckMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err278];
}
else {
vErrors.push(err278);
}
errors++;
}
}
if(data.status !== undefined){
let data86 = data.status;
if(typeof data86 !== "string"){
const err279 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/AckMessage/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err279];
}
else {
vErrors.push(err279);
}
errors++;
}
if("received" !== data86){
const err280 = {instancePath:instancePath+"/status",schemaPath:"#/$defs/AckMessage/properties/status/const",keyword:"const",params:{allowedValue: "received"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err280];
}
else {
vErrors.push(err280);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data87 = data.stream_id;
if(typeof data87 === "string"){
if(func1(data87) > 128){
const err281 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/AckMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err281];
}
else {
vErrors.push(err281);
}
errors++;
}
if(func1(data87) < 1){
const err282 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/AckMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err282];
}
else {
vErrors.push(err282);
}
errors++;
}
}
else {
const err283 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/AckMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err283];
}
else {
vErrors.push(err283);
}
errors++;
}
}
if(data.type !== undefined){
let data88 = data.type;
if(typeof data88 !== "string"){
const err284 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/AckMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err284];
}
else {
vErrors.push(err284);
}
errors++;
}
if("ack" !== data88){
const err285 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/AckMessage/properties/type/const",keyword:"const",params:{allowedValue: "ack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err285];
}
else {
vErrors.push(err285);
}
errors++;
}
}
}
else {
const err286 = {instancePath,schemaPath:"#/$defs/AckMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err286];
}
else {
vErrors.push(err286);
}
errors++;
}
var _valid0 = _errs222 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 11];
}
else {
if(_valid0){
valid0 = true;
passing0 = 11;
if(props0 !== true){
props0 = props0 || {};
props0.command_id = true;
props0.command_type = true;
props0.revision = true;
props0.schema_version = true;
props0.server_time = true;
props0.status = true;
props0.stream_id = true;
props0.type = true;
}
}
const _errs241 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stream_id === undefined){
const err287 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "stream_id"},message:"must have required property '"+"stream_id"+"'"};
if(vErrors === null){
vErrors = [err287];
}
else {
vErrors.push(err287);
}
errors++;
}
if(data.code === undefined){
const err288 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err288];
}
else {
vErrors.push(err288);
}
errors++;
}
if(data.message === undefined){
const err289 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "message"},message:"must have required property '"+"message"+"'"};
if(vErrors === null){
vErrors = [err289];
}
else {
vErrors.push(err289);
}
errors++;
}
if(data.schema_version === undefined){
const err290 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err290];
}
else {
vErrors.push(err290);
}
errors++;
}
if(data.revision === undefined){
const err291 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "revision"},message:"must have required property '"+"revision"+"'"};
if(vErrors === null){
vErrors = [err291];
}
else {
vErrors.push(err291);
}
errors++;
}
if(data.server_time === undefined){
const err292 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "server_time"},message:"must have required property '"+"server_time"+"'"};
if(vErrors === null){
vErrors = [err292];
}
else {
vErrors.push(err292);
}
errors++;
}
if(data.type === undefined){
const err293 = {instancePath,schemaPath:"#/$defs/ErrorMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err293];
}
else {
vErrors.push(err293);
}
errors++;
}
if(data.code !== undefined){
let data89 = data.code;
if(typeof data89 === "string"){
if(func1(data89) > 128){
const err294 = {instancePath:instancePath+"/code",schemaPath:"#/$defs/ErrorMessage/properties/code/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err294];
}
else {
vErrors.push(err294);
}
errors++;
}
if(func1(data89) < 1){
const err295 = {instancePath:instancePath+"/code",schemaPath:"#/$defs/ErrorMessage/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err295];
}
else {
vErrors.push(err295);
}
errors++;
}
}
else {
const err296 = {instancePath:instancePath+"/code",schemaPath:"#/$defs/ErrorMessage/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err296];
}
else {
vErrors.push(err296);
}
errors++;
}
}
if(data.command_id !== undefined){
let data90 = data.command_id;
const _errs247 = errors;
let valid37 = false;
const _errs248 = errors;
if(typeof data90 === "string"){
if(func1(data90) > 128){
const err297 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ErrorMessage/properties/command_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err297];
}
else {
vErrors.push(err297);
}
errors++;
}
if(func1(data90) < 1){
const err298 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ErrorMessage/properties/command_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err298];
}
else {
vErrors.push(err298);
}
errors++;
}
}
else {
const err299 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ErrorMessage/properties/command_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err299];
}
else {
vErrors.push(err299);
}
errors++;
}
var _valid9 = _errs248 === errors;
valid37 = valid37 || _valid9;
const _errs250 = errors;
if(data90 !== null){
const err300 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ErrorMessage/properties/command_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err300];
}
else {
vErrors.push(err300);
}
errors++;
}
var _valid9 = _errs250 === errors;
valid37 = valid37 || _valid9;
if(!valid37){
const err301 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ErrorMessage/properties/command_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err301];
}
else {
vErrors.push(err301);
}
errors++;
}
else {
errors = _errs247;
if(vErrors !== null){
if(_errs247){
vErrors.length = _errs247;
}
else {
vErrors = null;
}
}
}
}
if(data.details !== undefined){
let data91 = data.details;
const _errs253 = errors;
let valid38 = false;
const _errs254 = errors;
if(data91 && typeof data91 == "object" && !Array.isArray(data91)){
}
else {
const err302 = {instancePath:instancePath+"/details",schemaPath:"#/$defs/ErrorMessage/properties/details/anyOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err302];
}
else {
vErrors.push(err302);
}
errors++;
}
var _valid10 = _errs254 === errors;
valid38 = valid38 || _valid10;
const _errs257 = errors;
if(data91 !== null){
const err303 = {instancePath:instancePath+"/details",schemaPath:"#/$defs/ErrorMessage/properties/details/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err303];
}
else {
vErrors.push(err303);
}
errors++;
}
var _valid10 = _errs257 === errors;
valid38 = valid38 || _valid10;
if(!valid38){
const err304 = {instancePath:instancePath+"/details",schemaPath:"#/$defs/ErrorMessage/properties/details/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err304];
}
else {
vErrors.push(err304);
}
errors++;
}
else {
errors = _errs253;
if(vErrors !== null){
if(_errs253){
vErrors.length = _errs253;
}
else {
vErrors = null;
}
}
}
}
if(data.message !== undefined){
let data92 = data.message;
if(typeof data92 === "string"){
if(func1(data92) < 1){
const err305 = {instancePath:instancePath+"/message",schemaPath:"#/$defs/ErrorMessage/properties/message/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err305];
}
else {
vErrors.push(err305);
}
errors++;
}
}
else {
const err306 = {instancePath:instancePath+"/message",schemaPath:"#/$defs/ErrorMessage/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err306];
}
else {
vErrors.push(err306);
}
errors++;
}
}
if(data.revision !== undefined){
let data93 = data.revision;
if(!(((typeof data93 == "number") && (!(data93 % 1) && !isNaN(data93))) && (isFinite(data93)))){
const err307 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ErrorMessage/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err307];
}
else {
vErrors.push(err307);
}
errors++;
}
if((typeof data93 == "number") && (isFinite(data93))){
if(data93 < 0 || isNaN(data93)){
const err308 = {instancePath:instancePath+"/revision",schemaPath:"#/$defs/ErrorMessage/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err308];
}
else {
vErrors.push(err308);
}
errors++;
}
}
}
if(data.schema_version !== undefined){
let data94 = data.schema_version;
if(!(((typeof data94 == "number") && (!(data94 % 1) && !isNaN(data94))) && (isFinite(data94)))){
const err309 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ErrorMessage/properties/schema_version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err309];
}
else {
vErrors.push(err309);
}
errors++;
}
if(1 !== data94){
const err310 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ErrorMessage/properties/schema_version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err310];
}
else {
vErrors.push(err310);
}
errors++;
}
}
if(data.server_time !== undefined){
let data95 = data.server_time;
if(typeof data95 === "string"){
if(!(formats0.validate(data95))){
const err311 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ErrorMessage/properties/server_time/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err311];
}
else {
vErrors.push(err311);
}
errors++;
}
}
else {
const err312 = {instancePath:instancePath+"/server_time",schemaPath:"#/$defs/ErrorMessage/properties/server_time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err312];
}
else {
vErrors.push(err312);
}
errors++;
}
}
if(data.stream_id !== undefined){
let data96 = data.stream_id;
if(typeof data96 === "string"){
if(func1(data96) > 128){
const err313 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ErrorMessage/properties/stream_id/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err313];
}
else {
vErrors.push(err313);
}
errors++;
}
if(func1(data96) < 1){
const err314 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ErrorMessage/properties/stream_id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err314];
}
else {
vErrors.push(err314);
}
errors++;
}
}
else {
const err315 = {instancePath:instancePath+"/stream_id",schemaPath:"#/$defs/ErrorMessage/properties/stream_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err315];
}
else {
vErrors.push(err315);
}
errors++;
}
}
if(data.type !== undefined){
let data97 = data.type;
if(typeof data97 !== "string"){
const err316 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ErrorMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err316];
}
else {
vErrors.push(err316);
}
errors++;
}
if("error" !== data97){
const err317 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ErrorMessage/properties/type/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err317];
}
else {
vErrors.push(err317);
}
errors++;
}
}
}
else {
const err318 = {instancePath,schemaPath:"#/$defs/ErrorMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err318];
}
else {
vErrors.push(err318);
}
errors++;
}
var _valid0 = _errs241 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 12];
}
else {
if(_valid0){
valid0 = true;
passing0 = 12;
if(props0 !== true){
props0 = props0 || {};
props0.code = true;
props0.command_id = true;
props0.details = true;
props0.message = true;
props0.revision = true;
props0.schema_version = true;
props0.server_time = true;
props0.stream_id = true;
props0.type = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
if(!valid0){
const err319 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err319];
}
else {
vErrors.push(err319);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate20.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate20.evaluated = {"dynamicProps":true,"dynamicItems":false};

export const validateClientMessage = validate27;
const schema52 = {"$defs":{"ActionCommand":{"allOf":[{"if":{"properties":{"schema_version":{"const":1}},"required":["schema_version"]},"then":{"required":["prompt_id","turn_token"]}}],"properties":{"action":{"enum":["fold","check","call","bet","raise","allin"],"title":"Action","type":"string"},"amount":{"default":0,"minimum":0,"title":"Amount","type":"integer"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"prompt_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Prompt Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"turn_token":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Turn Token"},"type":{"const":"action","default":"action","title":"Type","type":"string"}},"required":["action","type"],"title":"ActionCommand","type":"object"},"AddChipsCommand":{"properties":{"amount":{"exclusiveMinimum":0,"title":"Amount","type":"integer"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"type":{"const":"add_chips","default":"add_chips","title":"Type","type":"string"}},"required":["amount","type"],"title":"AddChipsCommand","type":"object"},"AuthMessage":{"properties":{"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"token":{"minLength":1,"title":"Token","type":"string"},"type":{"const":"auth","default":"auth","title":"Type","type":"string"}},"required":["token","type"],"title":"AuthMessage","type":"object"},"ChatCommand":{"properties":{"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"text":{"maxLength":200,"minLength":1,"title":"Text","type":"string"},"type":{"const":"chat","default":"chat","title":"Type","type":"string"}},"required":["text","type"],"title":"ChatCommand","type":"object"},"SitCommand":{"properties":{"buyin":{"exclusiveMinimum":0,"title":"Buyin","type":"integer"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"type":{"const":"sit","default":"sit","title":"Type","type":"string"}},"required":["seat","buyin","type"],"title":"SitCommand","type":"object"},"StandCommand":{"properties":{"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"type":{"const":"stand","default":"stand","title":"Type","type":"string"}},"required":["type"],"title":"StandCommand","type":"object"}},"oneOf":[{"$ref":"#/$defs/AuthMessage"},{"$ref":"#/$defs/SitCommand"},{"$ref":"#/$defs/StandCommand"},{"$ref":"#/$defs/ActionCommand"},{"$ref":"#/$defs/AddChipsCommand"},{"$ref":"#/$defs/ChatCommand"}],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://pokerin.space/schema/ws/client-v1"};
const schema53 = {"properties":{"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"token":{"minLength":1,"title":"Token","type":"string"},"type":{"const":"auth","default":"auth","title":"Type","type":"string"}},"required":["token","type"],"title":"AuthMessage","type":"object"};
const schema54 = {"properties":{"buyin":{"exclusiveMinimum":0,"title":"Buyin","type":"integer"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"seat":{"minimum":0,"title":"Seat","type":"integer"},"type":{"const":"sit","default":"sit","title":"Type","type":"string"}},"required":["seat","buyin","type"],"title":"SitCommand","type":"object"};
const schema55 = {"properties":{"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"type":{"const":"stand","default":"stand","title":"Type","type":"string"}},"required":["type"],"title":"StandCommand","type":"object"};
const schema56 = {"allOf":[{"if":{"properties":{"schema_version":{"const":1}},"required":["schema_version"]},"then":{"required":["prompt_id","turn_token"]}}],"properties":{"action":{"enum":["fold","check","call","bet","raise","allin"],"title":"Action","type":"string"},"amount":{"default":0,"minimum":0,"title":"Amount","type":"integer"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"prompt_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Prompt Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"turn_token":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Turn Token"},"type":{"const":"action","default":"action","title":"Type","type":"string"}},"required":["action","type"],"title":"ActionCommand","type":"object"};
const schema57 = {"properties":{"amount":{"exclusiveMinimum":0,"title":"Amount","type":"integer"},"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"type":{"const":"add_chips","default":"add_chips","title":"Type","type":"string"}},"required":["amount","type"],"title":"AddChipsCommand","type":"object"};
const schema58 = {"properties":{"command_id":{"anyOf":[{"maxLength":128,"minLength":1,"type":"string"},{"type":"null"}],"default":null,"title":"Command Id"},"schema_version":{"anyOf":[{"const":1,"type":"integer"},{"type":"null"}],"default":null,"title":"Schema Version"},"text":{"maxLength":200,"minLength":1,"title":"Text","type":"string"},"type":{"const":"chat","default":"chat","title":"Type","type":"string"}},"required":["text","type"],"title":"ChatCommand","type":"object"};

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://pokerin.space/schema/ws/client-v1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.token === undefined){
const err0 = {instancePath,schemaPath:"#/$defs/AuthMessage/required",keyword:"required",params:{missingProperty: "token"},message:"must have required property '"+"token"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.type === undefined){
const err1 = {instancePath,schemaPath:"#/$defs/AuthMessage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.schema_version !== undefined){
let data0 = data.schema_version;
const _errs5 = errors;
let valid3 = false;
const _errs6 = errors;
if(!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))){
const err2 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AuthMessage/properties/schema_version/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(1 !== data0){
const err3 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AuthMessage/properties/schema_version/anyOf/0/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid1 = _errs6 === errors;
valid3 = valid3 || _valid1;
const _errs8 = errors;
if(data0 !== null){
const err4 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AuthMessage/properties/schema_version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var _valid1 = _errs8 === errors;
valid3 = valid3 || _valid1;
if(!valid3){
const err5 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AuthMessage/properties/schema_version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
else {
errors = _errs5;
if(vErrors !== null){
if(_errs5){
vErrors.length = _errs5;
}
else {
vErrors = null;
}
}
}
}
if(data.token !== undefined){
let data1 = data.token;
if(typeof data1 === "string"){
if(func1(data1) < 1){
const err6 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/AuthMessage/properties/token/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/AuthMessage/properties/token/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.type !== undefined){
let data2 = data.type;
if(typeof data2 !== "string"){
const err8 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/AuthMessage/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if("auth" !== data2){
const err9 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/AuthMessage/properties/type/const",keyword:"const",params:{allowedValue: "auth"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
else {
const err10 = {instancePath,schemaPath:"#/$defs/AuthMessage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = {};
props0.schema_version = true;
props0.token = true;
props0.type = true;
}
const _errs14 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.seat === undefined){
const err11 = {instancePath,schemaPath:"#/$defs/SitCommand/required",keyword:"required",params:{missingProperty: "seat"},message:"must have required property '"+"seat"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.buyin === undefined){
const err12 = {instancePath,schemaPath:"#/$defs/SitCommand/required",keyword:"required",params:{missingProperty: "buyin"},message:"must have required property '"+"buyin"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.type === undefined){
const err13 = {instancePath,schemaPath:"#/$defs/SitCommand/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.buyin !== undefined){
let data3 = data.buyin;
if(!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))){
const err14 = {instancePath:instancePath+"/buyin",schemaPath:"#/$defs/SitCommand/properties/buyin/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 <= 0 || isNaN(data3)){
const err15 = {instancePath:instancePath+"/buyin",schemaPath:"#/$defs/SitCommand/properties/buyin/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
if(data.command_id !== undefined){
let data4 = data.command_id;
const _errs20 = errors;
let valid6 = false;
const _errs21 = errors;
if(typeof data4 === "string"){
if(func1(data4) > 128){
const err16 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/SitCommand/properties/command_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(func1(data4) < 1){
const err17 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/SitCommand/properties/command_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/SitCommand/properties/command_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid2 = _errs21 === errors;
valid6 = valid6 || _valid2;
const _errs23 = errors;
if(data4 !== null){
const err19 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/SitCommand/properties/command_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
var _valid2 = _errs23 === errors;
valid6 = valid6 || _valid2;
if(!valid6){
const err20 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/SitCommand/properties/command_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
else {
errors = _errs20;
if(vErrors !== null){
if(_errs20){
vErrors.length = _errs20;
}
else {
vErrors = null;
}
}
}
}
if(data.schema_version !== undefined){
let data5 = data.schema_version;
const _errs26 = errors;
let valid7 = false;
const _errs27 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
const err21 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/SitCommand/properties/schema_version/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(1 !== data5){
const err22 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/SitCommand/properties/schema_version/anyOf/0/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
var _valid3 = _errs27 === errors;
valid7 = valid7 || _valid3;
const _errs29 = errors;
if(data5 !== null){
const err23 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/SitCommand/properties/schema_version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
var _valid3 = _errs29 === errors;
valid7 = valid7 || _valid3;
if(!valid7){
const err24 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/SitCommand/properties/schema_version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
else {
errors = _errs26;
if(vErrors !== null){
if(_errs26){
vErrors.length = _errs26;
}
else {
vErrors = null;
}
}
}
}
if(data.seat !== undefined){
let data6 = data.seat;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
const err25 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/SitCommand/properties/seat/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 < 0 || isNaN(data6)){
const err26 = {instancePath:instancePath+"/seat",schemaPath:"#/$defs/SitCommand/properties/seat/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
}
if(data.type !== undefined){
let data7 = data.type;
if(typeof data7 !== "string"){
const err27 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/SitCommand/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if("sit" !== data7){
const err28 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/SitCommand/properties/type/const",keyword:"const",params:{allowedValue: "sit"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
}
else {
const err29 = {instancePath,schemaPath:"#/$defs/SitCommand/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
var _valid0 = _errs14 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = props0 || {};
props0.buyin = true;
props0.command_id = true;
props0.schema_version = true;
props0.seat = true;
props0.type = true;
}
}
const _errs35 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err30 = {instancePath,schemaPath:"#/$defs/StandCommand/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data.command_id !== undefined){
let data8 = data.command_id;
const _errs39 = errors;
let valid10 = false;
const _errs40 = errors;
if(typeof data8 === "string"){
if(func1(data8) > 128){
const err31 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/StandCommand/properties/command_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(func1(data8) < 1){
const err32 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/StandCommand/properties/command_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
else {
const err33 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/StandCommand/properties/command_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
var _valid4 = _errs40 === errors;
valid10 = valid10 || _valid4;
const _errs42 = errors;
if(data8 !== null){
const err34 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/StandCommand/properties/command_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
var _valid4 = _errs42 === errors;
valid10 = valid10 || _valid4;
if(!valid10){
const err35 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/StandCommand/properties/command_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
else {
errors = _errs39;
if(vErrors !== null){
if(_errs39){
vErrors.length = _errs39;
}
else {
vErrors = null;
}
}
}
}
if(data.schema_version !== undefined){
let data9 = data.schema_version;
const _errs45 = errors;
let valid11 = false;
const _errs46 = errors;
if(!(((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9))) && (isFinite(data9)))){
const err36 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/StandCommand/properties/schema_version/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(1 !== data9){
const err37 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/StandCommand/properties/schema_version/anyOf/0/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
var _valid5 = _errs46 === errors;
valid11 = valid11 || _valid5;
const _errs48 = errors;
if(data9 !== null){
const err38 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/StandCommand/properties/schema_version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
var _valid5 = _errs48 === errors;
valid11 = valid11 || _valid5;
if(!valid11){
const err39 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/StandCommand/properties/schema_version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
else {
errors = _errs45;
if(vErrors !== null){
if(_errs45){
vErrors.length = _errs45;
}
else {
vErrors = null;
}
}
}
}
if(data.type !== undefined){
let data10 = data.type;
if(typeof data10 !== "string"){
const err40 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/StandCommand/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if("stand" !== data10){
const err41 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/StandCommand/properties/type/const",keyword:"const",params:{allowedValue: "stand"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
}
else {
const err42 = {instancePath,schemaPath:"#/$defs/StandCommand/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
var _valid0 = _errs35 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = props0 || {};
props0.command_id = true;
props0.schema_version = true;
props0.type = true;
}
}
const _errs52 = errors;
const _errs56 = errors;
let valid14 = true;
const _errs57 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.schema_version === undefined) && (missing0 = "schema_version")){
const err43 = {};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
else {
if(data.schema_version !== undefined){
if(1 !== data.schema_version){
const err44 = {};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
}
}
var _valid6 = _errs57 === errors;
errors = _errs56;
if(vErrors !== null){
if(_errs56){
vErrors.length = _errs56;
}
else {
vErrors = null;
}
}
if(_valid6){
const _errs59 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.prompt_id === undefined){
const err45 = {instancePath,schemaPath:"#/$defs/ActionCommand/allOf/0/then/required",keyword:"required",params:{missingProperty: "prompt_id"},message:"must have required property '"+"prompt_id"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data.turn_token === undefined){
const err46 = {instancePath,schemaPath:"#/$defs/ActionCommand/allOf/0/then/required",keyword:"required",params:{missingProperty: "turn_token"},message:"must have required property '"+"turn_token"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
var _valid6 = _errs59 === errors;
valid14 = _valid6;
}
if(!valid14){
const err47 = {instancePath,schemaPath:"#/$defs/ActionCommand/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.action === undefined){
const err48 = {instancePath,schemaPath:"#/$defs/ActionCommand/required",keyword:"required",params:{missingProperty: "action"},message:"must have required property '"+"action"+"'"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data.type === undefined){
const err49 = {instancePath,schemaPath:"#/$defs/ActionCommand/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(data.action !== undefined){
let data12 = data.action;
if(typeof data12 !== "string"){
const err50 = {instancePath:instancePath+"/action",schemaPath:"#/$defs/ActionCommand/properties/action/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(!((((((data12 === "fold") || (data12 === "check")) || (data12 === "call")) || (data12 === "bet")) || (data12 === "raise")) || (data12 === "allin"))){
const err51 = {instancePath:instancePath+"/action",schemaPath:"#/$defs/ActionCommand/properties/action/enum",keyword:"enum",params:{allowedValues: schema56.properties.action.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data.amount !== undefined){
let data13 = data.amount;
if(!(((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13))) && (isFinite(data13)))){
const err52 = {instancePath:instancePath+"/amount",schemaPath:"#/$defs/ActionCommand/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if((typeof data13 == "number") && (isFinite(data13))){
if(data13 < 0 || isNaN(data13)){
const err53 = {instancePath:instancePath+"/amount",schemaPath:"#/$defs/ActionCommand/properties/amount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
}
if(data.command_id !== undefined){
let data14 = data.command_id;
const _errs65 = errors;
let valid17 = false;
const _errs66 = errors;
if(typeof data14 === "string"){
if(func1(data14) > 128){
const err54 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ActionCommand/properties/command_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(func1(data14) < 1){
const err55 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ActionCommand/properties/command_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
else {
const err56 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ActionCommand/properties/command_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
var _valid7 = _errs66 === errors;
valid17 = valid17 || _valid7;
const _errs68 = errors;
if(data14 !== null){
const err57 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ActionCommand/properties/command_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
var _valid7 = _errs68 === errors;
valid17 = valid17 || _valid7;
if(!valid17){
const err58 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ActionCommand/properties/command_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
else {
errors = _errs65;
if(vErrors !== null){
if(_errs65){
vErrors.length = _errs65;
}
else {
vErrors = null;
}
}
}
}
if(data.prompt_id !== undefined){
let data15 = data.prompt_id;
const _errs71 = errors;
let valid18 = false;
const _errs72 = errors;
if(typeof data15 === "string"){
if(func1(data15) > 128){
const err59 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionCommand/properties/prompt_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
if(func1(data15) < 1){
const err60 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionCommand/properties/prompt_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
else {
const err61 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionCommand/properties/prompt_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
var _valid8 = _errs72 === errors;
valid18 = valid18 || _valid8;
const _errs74 = errors;
if(data15 !== null){
const err62 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionCommand/properties/prompt_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
var _valid8 = _errs74 === errors;
valid18 = valid18 || _valid8;
if(!valid18){
const err63 = {instancePath:instancePath+"/prompt_id",schemaPath:"#/$defs/ActionCommand/properties/prompt_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
else {
errors = _errs71;
if(vErrors !== null){
if(_errs71){
vErrors.length = _errs71;
}
else {
vErrors = null;
}
}
}
}
if(data.schema_version !== undefined){
let data16 = data.schema_version;
const _errs77 = errors;
let valid19 = false;
const _errs78 = errors;
if(!(((typeof data16 == "number") && (!(data16 % 1) && !isNaN(data16))) && (isFinite(data16)))){
const err64 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionCommand/properties/schema_version/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
if(1 !== data16){
const err65 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionCommand/properties/schema_version/anyOf/0/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
var _valid9 = _errs78 === errors;
valid19 = valid19 || _valid9;
const _errs80 = errors;
if(data16 !== null){
const err66 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionCommand/properties/schema_version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
var _valid9 = _errs80 === errors;
valid19 = valid19 || _valid9;
if(!valid19){
const err67 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ActionCommand/properties/schema_version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
else {
errors = _errs77;
if(vErrors !== null){
if(_errs77){
vErrors.length = _errs77;
}
else {
vErrors = null;
}
}
}
}
if(data.turn_token !== undefined){
let data17 = data.turn_token;
const _errs83 = errors;
let valid20 = false;
const _errs84 = errors;
if(typeof data17 === "string"){
if(func1(data17) > 128){
const err68 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionCommand/properties/turn_token/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
if(func1(data17) < 1){
const err69 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionCommand/properties/turn_token/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
else {
const err70 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionCommand/properties/turn_token/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
var _valid10 = _errs84 === errors;
valid20 = valid20 || _valid10;
const _errs86 = errors;
if(data17 !== null){
const err71 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionCommand/properties/turn_token/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
var _valid10 = _errs86 === errors;
valid20 = valid20 || _valid10;
if(!valid20){
const err72 = {instancePath:instancePath+"/turn_token",schemaPath:"#/$defs/ActionCommand/properties/turn_token/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
else {
errors = _errs83;
if(vErrors !== null){
if(_errs83){
vErrors.length = _errs83;
}
else {
vErrors = null;
}
}
}
}
if(data.type !== undefined){
let data18 = data.type;
if(typeof data18 !== "string"){
const err73 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ActionCommand/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
if("action" !== data18){
const err74 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ActionCommand/properties/type/const",keyword:"const",params:{allowedValue: "action"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
}
else {
const err75 = {instancePath,schemaPath:"#/$defs/ActionCommand/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
var _valid0 = _errs52 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = props0 || {};
props0.action = true;
props0.amount = true;
props0.command_id = true;
props0.prompt_id = true;
props0.schema_version = true;
props0.turn_token = true;
props0.type = true;
}
}
const _errs90 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.amount === undefined){
const err76 = {instancePath,schemaPath:"#/$defs/AddChipsCommand/required",keyword:"required",params:{missingProperty: "amount"},message:"must have required property '"+"amount"+"'"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
if(data.type === undefined){
const err77 = {instancePath,schemaPath:"#/$defs/AddChipsCommand/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
if(data.amount !== undefined){
let data19 = data.amount;
if(!(((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19))) && (isFinite(data19)))){
const err78 = {instancePath:instancePath+"/amount",schemaPath:"#/$defs/AddChipsCommand/properties/amount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
if((typeof data19 == "number") && (isFinite(data19))){
if(data19 <= 0 || isNaN(data19)){
const err79 = {instancePath:instancePath+"/amount",schemaPath:"#/$defs/AddChipsCommand/properties/amount/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
if(data.command_id !== undefined){
let data20 = data.command_id;
const _errs96 = errors;
let valid23 = false;
const _errs97 = errors;
if(typeof data20 === "string"){
if(func1(data20) > 128){
const err80 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AddChipsCommand/properties/command_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
if(func1(data20) < 1){
const err81 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AddChipsCommand/properties/command_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
else {
const err82 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AddChipsCommand/properties/command_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
var _valid11 = _errs97 === errors;
valid23 = valid23 || _valid11;
const _errs99 = errors;
if(data20 !== null){
const err83 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AddChipsCommand/properties/command_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
var _valid11 = _errs99 === errors;
valid23 = valid23 || _valid11;
if(!valid23){
const err84 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/AddChipsCommand/properties/command_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
else {
errors = _errs96;
if(vErrors !== null){
if(_errs96){
vErrors.length = _errs96;
}
else {
vErrors = null;
}
}
}
}
if(data.schema_version !== undefined){
let data21 = data.schema_version;
const _errs102 = errors;
let valid24 = false;
const _errs103 = errors;
if(!(((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21))) && (isFinite(data21)))){
const err85 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AddChipsCommand/properties/schema_version/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
if(1 !== data21){
const err86 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AddChipsCommand/properties/schema_version/anyOf/0/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
var _valid12 = _errs103 === errors;
valid24 = valid24 || _valid12;
const _errs105 = errors;
if(data21 !== null){
const err87 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AddChipsCommand/properties/schema_version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
var _valid12 = _errs105 === errors;
valid24 = valid24 || _valid12;
if(!valid24){
const err88 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/AddChipsCommand/properties/schema_version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
else {
errors = _errs102;
if(vErrors !== null){
if(_errs102){
vErrors.length = _errs102;
}
else {
vErrors = null;
}
}
}
}
if(data.type !== undefined){
let data22 = data.type;
if(typeof data22 !== "string"){
const err89 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/AddChipsCommand/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
if("add_chips" !== data22){
const err90 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/AddChipsCommand/properties/type/const",keyword:"const",params:{allowedValue: "add_chips"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
}
else {
const err91 = {instancePath,schemaPath:"#/$defs/AddChipsCommand/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
var _valid0 = _errs90 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = props0 || {};
props0.amount = true;
props0.command_id = true;
props0.schema_version = true;
props0.type = true;
}
}
const _errs109 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.text === undefined){
const err92 = {instancePath,schemaPath:"#/$defs/ChatCommand/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if(data.type === undefined){
const err93 = {instancePath,schemaPath:"#/$defs/ChatCommand/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
if(data.command_id !== undefined){
let data23 = data.command_id;
const _errs113 = errors;
let valid27 = false;
const _errs114 = errors;
if(typeof data23 === "string"){
if(func1(data23) > 128){
const err94 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ChatCommand/properties/command_id/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
if(func1(data23) < 1){
const err95 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ChatCommand/properties/command_id/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
}
else {
const err96 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ChatCommand/properties/command_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
var _valid13 = _errs114 === errors;
valid27 = valid27 || _valid13;
const _errs116 = errors;
if(data23 !== null){
const err97 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ChatCommand/properties/command_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
var _valid13 = _errs116 === errors;
valid27 = valid27 || _valid13;
if(!valid27){
const err98 = {instancePath:instancePath+"/command_id",schemaPath:"#/$defs/ChatCommand/properties/command_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
else {
errors = _errs113;
if(vErrors !== null){
if(_errs113){
vErrors.length = _errs113;
}
else {
vErrors = null;
}
}
}
}
if(data.schema_version !== undefined){
let data24 = data.schema_version;
const _errs119 = errors;
let valid28 = false;
const _errs120 = errors;
if(!(((typeof data24 == "number") && (!(data24 % 1) && !isNaN(data24))) && (isFinite(data24)))){
const err99 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ChatCommand/properties/schema_version/anyOf/0/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
if(1 !== data24){
const err100 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ChatCommand/properties/schema_version/anyOf/0/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
var _valid14 = _errs120 === errors;
valid28 = valid28 || _valid14;
const _errs122 = errors;
if(data24 !== null){
const err101 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ChatCommand/properties/schema_version/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
var _valid14 = _errs122 === errors;
valid28 = valid28 || _valid14;
if(!valid28){
const err102 = {instancePath:instancePath+"/schema_version",schemaPath:"#/$defs/ChatCommand/properties/schema_version/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
else {
errors = _errs119;
if(vErrors !== null){
if(_errs119){
vErrors.length = _errs119;
}
else {
vErrors = null;
}
}
}
}
if(data.text !== undefined){
let data25 = data.text;
if(typeof data25 === "string"){
if(func1(data25) > 200){
const err103 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/ChatCommand/properties/text/maxLength",keyword:"maxLength",params:{limit: 200},message:"must NOT have more than 200 characters"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
if(func1(data25) < 1){
const err104 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/ChatCommand/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
}
else {
const err105 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/ChatCommand/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
if(data.type !== undefined){
let data26 = data.type;
if(typeof data26 !== "string"){
const err106 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ChatCommand/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
if("chat" !== data26){
const err107 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/ChatCommand/properties/type/const",keyword:"const",params:{allowedValue: "chat"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
}
}
else {
const err108 = {instancePath,schemaPath:"#/$defs/ChatCommand/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
var _valid0 = _errs109 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = props0 || {};
props0.command_id = true;
props0.schema_version = true;
props0.text = true;
props0.type = true;
}
}
}
}
}
}
}
if(!valid0){
const err109 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate27.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate27.evaluated = {"dynamicProps":true,"dynamicItems":false};
