import { decimalAmount,parseAmount } from './money.ts';
type Fraction={n:bigint;d:bigint};
// Restricted arithmetic grammar. Monetary rounding happens once, at six decimals.
export function evaluateAmount(input:string):bigint {
 if(input.length>200)throw Error('amount');
 const source=input.replace(/\s/g,'');let index=0,depth=0;
 const atom=():Fraction=>{
  if(++depth>20)throw Error('amount');let result:Fraction;
  const sign=source[index]==='-'?(index++,-1n):source[index]==='+'?(index++,1n):1n;
  if(source[index]==='('){index++;result=expression();if(source[index++]!==')')throw Error('amount');}
  else {const match=/^\d{1,9}(?:[.,]\d{1,6})?/.exec(source.slice(index));if(!match)throw Error('amount');index+=match[0].length;result={n:parseAmount(match[0]),d:1000000n};}
  depth--;return {n:sign*result.n,d:result.d};
 };
 const product=():Fraction=>{let a=atom();while(source[index]==='*'||source[index]==='/'){const op=source[index++],b=atom();if(op==='*')a={n:a.n*b.n,d:a.d*b.d};else{if(b.n===0n)throw Error('amount');a={n:a.n*b.d,d:a.d*b.n};}}return a;};
 const expression=():Fraction=>{let a=product();while(source[index]==='+'||source[index]==='-'){const op=source[index++],b=product();a={n:a.n*b.d+(op==='+'?1n:-1n)*b.n*a.d,d:a.d*b.d};}return a;};
 const value=expression();if(index!==source.length)throw Error('amount');
 const negative=(value.n<0n)!==(value.d<0n),n=(value.n<0n?-value.n:value.n)*1000000n,d=value.d<0n?-value.d:value.d;
 const rounded=n/d+(n%d*2n>=d?1n:0n),result=negative?-rounded:rounded;
 parseAmount(decimalAmount(result));return result;
}
