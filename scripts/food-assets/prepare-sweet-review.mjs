import fs from 'node:fs';
import {ITEMS, defaultOptions, normalizeOptions} from '../../catalog.js';
import {sweetRecipe} from '../../food-recipes-sweet.js';
const target = new URL('../../assets/models/sweet/review/input.json', import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('../../assets/models/sweet/manifest.json',import.meta.url),'utf8'));
for(const a of Object.values(manifest.ingredients))a.url='./sweet/'+a.url.slice(2);
const dishes=[];
for(const item of ITEMS){
 const defaults=defaultOptions(item.id);if(!sweetRecipe(item,defaults))continue;
 const minimal=Object.fromEntries(item.options.map(g=>[g.id,g.type==='multiple'?[]:(g.choices.find(c=>c.id==='none')?.id??g.choices[0].id)]));
 const loaded=Object.fromEntries(item.options.map(g=>[g.id,g.type==='multiple'?g.choices.map(c=>c.id):(g.choices.find(c=>['large','chocolate'].includes(c.id))?.id??g.choices[0].id)]));
 for(const [variant,value] of [['default',defaults],['minimal',minimal],['loaded',loaded]]){
 const options=normalizeOptions(item.id,value);
 const layers=sweetRecipe(item,options).map(p=>({...p,scale:Array.isArray(p.scale)?p.scale:[p.scale,p.scale,p.scale]}));
 dishes.push({id:item.id,name:item.name,category:item.category,variant,options,layers});
 }
}
const floatItem=ITEMS.find(item=>item.id==='cold-brew-float');
for(const size of ['regular','large'])for(const scoop of ['vanilla','chocolate']){
 const options={size,scoop,toppings:['whipped-cream']};
 const layers=sweetRecipe(floatItem,options).map(p=>({...p,scale:Array.isArray(p.scale)?p.scale:[p.scale,p.scale,p.scale]}));
 dishes.push({id:floatItem.id,name:floatItem.name,category:floatItem.category,variant:`${scoop}-${size}`,options,layers});
}
fs.writeFileSync(target,JSON.stringify({manifest,dishes},null,2));
console.log(dishes.length+' sweet review recipes');
