var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

!function(r){function t(o){if(n[o])return n[o].exports;var e=n[o]={exports:{},id:o,loaded:!1};return r[o].call(e.exports,e,e.exports,t),e.loaded=!0,e.exports}var n={};return t.m=r,t.c=n,t.p="/assets/",t(0)}([function(r,t,n){function o(r){return r&&r.__esModule?r:{"default":r}}var e=n(1),a=o(e);onmessage=function(r){var t=r.data;a["default"](t,function(r,t){null!=r?postMessage({err:r}):postMessage({output:t},[t.buffer])})}},function(r,t,n){"use strict";var o=n(2);r.exports=function(r,t){var n=o(r);t(null,n)}},function(r,t,n){"use strict";function o(r){return 0>r?0:r>255?255:r}function e(r){return Math.floor(r*c)}function a(r,t,n){var o,a,f,i,u,s,h,l,c,M,p,d,w,g,y,x,A,m=v[r].filter,I=n/t,U=1/I,b=Math.min(1,I),q=v[r].win/b,P=Math.floor(2*(q+1)),T=new Int16Array((P+2)*n),_=0;for(o=0;n>o;o++){for(a=(o+.5)*U,f=Math.max(0,Math.floor(a-q)),i=Math.min(t-1,Math.ceil(a+q)),u=i-f+1,s=new Float32Array(u),h=new Int16Array(u),l=0,M=f,p=0;i>=M;M++,p++)d=m((M+.5-a)*b),l+=d,s[p]=d;for(c=0,p=0;p<s.length;p++)w=e(s[p]/l),c+=w,h[p]=w;for(h[n>>1]+=e(1)-c,g=0;g<h.length&&0===h[g];)g++;if(g<h.length){for(y=h.length-1;y>0&&0===h[y];)y--;x=f+g,A=y-g+1,T[_++]=x,T[_++]=A,T.set(h.subarray(g,y+1),_),_+=A}else T[_++]=0,T[_++]=0}return T}function f(r,t,n,e,a,f){var i,u,s,h,l,c,v,M,p,d,w,g=0,y=0;for(p=0;e>p;p++){for(l=0,d=0;a>d;d++){for(c=f[l++],v=f[l++],M=g+4*c|0,i=u=s=h=0;v>0;v--)w=f[l++],h=h+w*r[M+3]|0,s=s+w*r[M+2]|0,u=u+w*r[M+1]|0,i=i+w*r[M]|0,M=M+4|0;t[y+3]=o(h>>14),t[y+2]=o(s>>14),t[y+1]=o(u>>14),t[y]=o(i>>14),y=y+4*e|0}y=4*(p+1)|0,g=(p+1)*n*4|0}}function i(r,t,n,e,a,f){var i,u,s,h,l,c,v,M,p,d,w,g=0,y=0;for(p=0;e>p;p++){for(l=0,d=0;a>d;d++){for(c=f[l++],v=f[l++],M=g+4*c|0,i=u=s=h=0;v>0;v--)w=f[l++],h=h+w*r[M+3]|0,s=s+w*r[M+2]|0,u=u+w*r[M+1]|0,i=i+w*r[M]|0,M=M+4|0;t[y+3]=o(h>>14),t[y+2]=o(s>>14),t[y+1]=o(u>>14),t[y]=o(i>>14),y=y+4*e|0}y=4*(p+1)|0,g=(p+1)*n*4|0}}function u(r,t,n){for(var o=3,e=t*n*4|0;e>o;)r[o]=255,o=o+4|0}function s(r){var t=r.src,n=r.width,o=r.height,e=r.toWidth,s=r.toHeight,l=r.dest||new Uint8Array(e*s*4),c=void 0===r.quality?3:r.quality,v=r.alpha||!1,M=void 0===r.unsharpAmount?0:0|r.unsharpAmount,p=void 0===r.unsharpThreshold?0:0|r.unsharpThreshold;if(1>n||1>o||1>e||1>s)return[];var d=a(c,n,e),w=a(c,o,s),g=new Uint8Array(e*o*4);return f(t,g,n,o,e,d),i(g,l,o,e,s,w),v||u(l,e,s),M&&h(l,e,s,M,1,p),l}var h=n(3),l=14,c=1<<l,v=[{win:.5,filter:function(r){return r>=-.5&&.5>r?1:0}},{win:1,filter:function(r){if(-1>=r||r>=1)return 0;if(r>-1.1920929e-7&&1.1920929e-7>r)return 1;var t=r*Math.PI;return Math.sin(t)/t*(.54+.46*Math.cos(t/1))}},{win:2,filter:function(r){if(-2>=r||r>=2)return 0;if(r>-1.1920929e-7&&1.1920929e-7>r)return 1;var t=r*Math.PI;return Math.sin(t)/t*Math.sin(t/2)/(t/2)}},{win:3,filter:function(r){if(-3>=r||r>=3)return 0;if(r>-1.1920929e-7&&1.1920929e-7>r)return 1;var t=r*Math.PI;return Math.sin(t)/t*Math.sin(t/3)/(t/3)}}];r.exports=s},function(r,t,n){"use strict";function o(r){return 0>r?0:r>255?255:r}function e(r,t,n){var o,e,a=t*n,f=new Uint16Array(a);for(o=0,e=0;a>o;o++)f[o]=7471*r[e+2]+38470*r[e+1]+19595*r[e]>>>8,e=e+4|0;return f}function a(r,t,n,a,i,u){var s,h,l,c,v,M=0,p=Math.floor(256*a/50),d=e(r,t,n),w=f(d,t,n,1),g=u<<8,y=0;for(h=0;n>h;h++)for(s=0;t>s;s++)M=d[y]-w[y],Math.abs(M)>g&&(c=65536+(M*p>>8),v=4*y,l=r[v],r[v++]=o(l*c>>16),l=r[v],r[v++]=o(l*c>>16),l=r[v],r[v]=o(l*c>>16)),y++}var f=n(4);r.exports=a},function(r,t,n){"use strict";function o(r,t,n,o,e){var f,s,h,l,c,v,M,p=0,d=a,w=i;if(v=0,M=0,t>=w&&n>=w&&o>t+w&&e>n+w){for(s=0;3>s;s++)for(f=0;3>f;f++)h=t+f-w,l=n+s-w,M+=r[h+l*o]*d[p++];return(M-M%u)/u}for(s=0;3>s;s++)for(f=0;3>f;f++)h=t+f-w,l=n+s-w,h>=0&&o>h&&l>=0&&e>l&&(c=d[p],v+=c,M+=r[h+l*o]*c),p++;return(M-M%v)/v|0}function e(r,t,n){var e,a,f=new Uint16Array(r.length);for(e=0;t>e;e++)for(a=0;n>a;a++)f[a*t+e]=o(r,e,a,t,n);return f}for(var a=new Uint8Array([1,2,1,2,4,2,1,2,1]),f=Math.floor(Math.sqrt(a.length)),i=Math.floor(f/2),u=0,s=0;s<a.length;s++)u+=a[s];r.exports=e}]);
//# sourceMappingURL=4d3b9be0ba7b47bf6f87.worker.js.map

}
/*
     FILE ARCHIVED ON 16:59:40 Aug 25, 2015 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 00:47:23 Jun 24, 2023.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 97.039
  exclusion.robots: 0.143
  exclusion.robots.policy: 0.134
  RedisCDXSource: 5.719
  esindex: 0.005
  LoadShardBlock: 73.468 (3)
  PetaboxLoader3.datanode: 66.827 (4)
  load_resource: 85.881
  PetaboxLoader3.resolve: 52.492
*/