const fs = require('node:fs');
const { routeKey } = require('./api-contracts');
const file = 'player-app-api.postman_collection.json';
const collection = JSON.parse(fs.readFileSync(file));
const scalar = (type) => ({ type });
const object = (properties) => ({ type: 'object', properties });
const array = (items) => ({ type: 'array', items });
const string = scalar('string'); const number = scalar('number'); const boolean = scalar('boolean');
const settingsKeys = ['_id','whatsapp_Number','whatsapp_Number_first','home_screen_marquee','apk_version','withdraw_upi','min_deposit','max_deposit','min_withdraw','max_withdraw','per_day_withdraw_request','withdraw_open_time','withdraw_close_time','withdraw_enable_disable','deposit_on_off','bonus_unlock_min_deposit'];
function flatten(items) { return items.flatMap((item) => item.item ? flatten(item.item) : item.request ? [item] : []); }
const items = flatten(collection.item);
function override(id, contract) {
  items[id - 1]['x-assertions'] = { kind: 'explicit', expectedSuccess: '1', ...contract };
  items[id - 1]['x-contract-source'] = 'Supplied master 2026-10-28: TC-PROF-001/002/060/061, TC-WDR-001, TC-BANK-021';
}
const profile = object({
  _id: string, user_id: string, username: string, mobile: string, status: string, credit: number,
  withdraw_min: number, withdraw_max: number, withdraw_per_day: number,
  main_notification: string, game_notification: string, kingstarline_notification: string, kingjacport_notification: string
});
const settingSchema = object(Object.fromEntries(settingsKeys.map((key) => [key, { type: 'nullable' }])));
override(3, {
  schema: object({success:string,message:string,data:profile,settingData:array(settingSchema),bonus_locked:number,
    withdraw_limits:object({ source: string, min: number, max: number, per_day: number, open_time: string, close_time: string, enabled: boolean })}),
  equals: {message:'Your profile, balance and app settings.','data.status':'active'},
  absent: ['data.password','data.simple_password','data.password_copy','data.mpin','data.token','support'],
  exactKeys: {'settingData.0':settingsKeys}
});
override(10, { schema: object({success:string,message:string,data:settingSchema}), equals: {message:'The app settings.'},exactKeys:{data:settingsKeys} });
override(94, { schema: object({success:string,data:array(settingSchema)}),equals:{message:'The contact details and app settings.'},exactKeys:{'data.0':settingsKeys} });
override(68, { schema: object({success:string,message:string,data:object({min_withdraw:number,max_withdraw:number,opentime:string,closetime:string,min_deposit:number,max_deposit:number,per_day:number,source:string,withdrawals_enabled:boolean})}),
  equals:{'data.source':'app'}, exactKeys:{data:['min_withdraw','max_withdraw','opentime','closetime','min_deposit','max_deposit','per_day','source','withdrawals_enabled']} });
// TC-DEP-001 intentionally removes bank details, image and timestamps from channels.
override(63,{schema:object({success:string,message:string,data:array(object({_id:string,name:string,type:string,status:string,min:number,max:number,upi_id:{type:'nullable'},effective_min:number,effective_max:number})),deposit_limits:object({min_deposit:number,max_deposit:number})}),
  absent:['data.0.account_number','data.0.ifsc_code','data.0.bank_name','data.0.image','data.0.app_id','data.0.user_id','data.0.created_at','data.0.updated_at']});
for (const id of [57,58,59]) override(id,{schema:object({success:string,message:string,data:array(object({result:string})),pagination:number,totalRecords:number,totalNumberPage:number,total_win_amount:number})});
// The supplied current auth matrix places getway-list behind session middleware.
items[62].request.auth = { type: 'bearer', bearer: [{key:'token',value:'{{player_token}}',type:'string'}] };
for (const id of [69,70]) {
  const body = JSON.parse(items[id - 1].response[0].body);
  for (const row of body.data || []) delete row.__v;
  const { assertionContract } = require('./api-assertions');
  const schema = assertionContract({request:items[id-1].request,response:[{body:JSON.stringify(body)}]}).schema;
  override(id,{schema});
}
// Current behaviour must retain removed routes as 404 probes, never old refusal bodies.
for (const item of items.filter((item) => item['x-retired'])) {
  const key = routeKey(item.request.method,item.request.url.raw || item.request.url);
  item['x-assertions'] = {kind:'explicit',expectedSuccess:'0',equals:{message:`There is no ${key.replace(' ', ' /api/')} on this server. Check the address and the method (GET or POST).`}};
}
fs.writeFileSync(file,JSON.stringify(collection,null,2)+'\n');
console.log('Aligned current contracts to supplied master; legacy examples retained as historical evidence.');
