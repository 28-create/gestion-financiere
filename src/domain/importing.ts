export function sourceMicros(raw:string,decimal: 'auto' | '.' | ',' = 'auto'):bigint{
 let value=raw.trim().replace(/[\s\u00a0\u202f₪€$£]/g,'');if(value.length>200)throw Error('amount');if(/^\(.*\)$/.test(value))value='-'+value.slice(1,-1);
 if(decimal===',')value=value.replaceAll('.','').replace(',','.');else if(decimal==='.')value=value.replaceAll(',','');else if(value.includes(',')&&value.includes('.'))value=value.lastIndexOf(',')>value.lastIndexOf('.')?value.replaceAll('.','').replace(',','.'):value.replaceAll(',','');else value=value.replace(',','.');
 const match=/^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);if(!match)throw Error('amount');const exponent=Number(match[4]??0);if(Math.abs(exponent)>30)throw Error('amount');
 const fraction=match[3]??'',digits=BigInt(match[2]+fraction),scale=6+exponent-fraction.length;let amount:bigint;
 if(scale>=0)amount=digits*10n**BigInt(scale);else{const denominator=10n**BigInt(-scale),remainder=digits%denominator,distance=remainder*2n>denominator?denominator-remainder:remainder;if(distance*1000000n>denominator)throw Error('precision');amount=digits/denominator+(remainder*2n>=denominator?1n:0n);}
 if(amount>999999999999999n)throw Error('amount');return match[1]==='-'?-amount:amount;
}
export function sourceDate(raw:string,format:'auto'|'iso'|'dmy'|'mdy'|'excel'='auto',since1904=false){
 const text=raw.trim();let value=text;
 if(format==='excel'){const serial=Number(text);if(!Number.isFinite(serial)||serial<0||(!since1904&&Math.floor(serial)===60))throw Error('date');const base=Date.UTC(since1904?1904:1899,since1904?0:11,since1904?1:31);value=new Date(base+(Math.floor(serial)-(!since1904&&serial>60?1:0))*86400000).toISOString().slice(0,10);}
 else if(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text))value=text.slice(0,10);
 else {const match=/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text);if(!match)throw Error('date');const [first,second]=format==='mdy'?[match[2],match[1]]:[match[1],match[2]];value=`${match[3]}-${second.padStart(2,'0')}-${first.padStart(2,'0')}`;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))throw Error('date');const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==value)throw Error('date');return value;
}
export function parseDelimited(text:string,delimiter:string){
 if(text.length>30000000||![',',';','\t'].includes(delimiter))throw Error('size');const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}if(closed&&c!==delimiter&&c!=='\n'&&c!=='\r')throw Error('csv');if(c==='"'&&!cell){quoted=true;continue;}if(c===delimiter){row.push(cell);cell='';closed=false;}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;}else cell+=c;}
 if(quoted)throw Error('csv');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export function detectDelimiter(text:string){return ['\t',';',','].map(delimiter=>{try{return {delimiter,count:parseDelimited(text.split(/\r?\n/,1)[0],delimiter)[0]?.length??0};}catch{return {delimiter,count:0};}}).sort((a,b)=>b.count-a.count)[0].delimiter;}
export function convertMicros(original:bigint,rate:bigint){if(rate<=0n)throw Error('rate');const n=original*rate,abs=n<0n?-n:n;const amount=abs/1000000n+(abs%1000000n>=500000n?1n:0n);if(amount>999999999999999n)throw Error('amount');return n<0n?-amount:amount;}
