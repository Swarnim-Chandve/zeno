2:I[9275,[],""]
3:I[1343,[],""]
5:I[6639,["50","static/chunks/50-91a16fdb5c9598c8.js","463","static/chunks/463-3f4b147d90299b92.js","185","static/chunks/app/layout-e86c3e171dad4209.js"],"ErrorBoundary"]
6:I[9082,["50","static/chunks/50-91a16fdb5c9598c8.js","463","static/chunks/463-3f4b147d90299b92.js","185","static/chunks/app/layout-e86c3e171dad4209.js"],"Providers"]
4:T4c9,
              // Immediate ethereum protection - runs before any other scripts
              (function() {
                if (typeof window === 'undefined') return;
                
                const originalDefineProperty = Object.defineProperty;
                Object.defineProperty = function(obj, prop, descriptor) {
                  if (prop === 'ethereum' && obj === window && window.ethereum) {
                    console.log('Blocking ethereum redefinition');
                    return obj;
                  }
                  try {
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  } catch (error) {
                    return obj;
                  }
                };
                
                // Make ethereum non-configurable if it exists
                if (window.ethereum) {
                  try {
                    Object.defineProperty(window, 'ethereum', {
                      value: window.ethereum,
                      writable: true,
                      enumerable: true,
                      configurable: false
                    });
                  } catch (e) {}
                }
              })();
            7:{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"}
8:{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"}
9:{"display":"inline-block"}
a:{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0}
0:["FJgZJrbd6LkS-PTS73ut4",[[["",{"children":["/_not-found",{"children":["__PAGE__",{}]}]},"$undefined","$undefined",true],["",{"children":["/_not-found",{"children":["__PAGE__",{},[["$L1",[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":"404"}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]]],null],null]},["$","$L2",null,{"parallelRouterKey":"children","segmentPath":["children","/_not-found","children"],"error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L3",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","notFoundStyles":"$undefined","styles":null}],null]},[["$","html",null,{"lang":"en","children":[["$","head",null,{"children":[["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$4"}}],["$","script",null,{"src":"/ethereum-fix.js"}]]}],["$","body",null,{"className":"__className_f367f3","children":["$","$L5",null,{"children":["$","$L6",null,{"children":["$","$L2",null,{"parallelRouterKey":"children","segmentPath":["children"],"error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L3",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":"$7","children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":"$8","children":"404"}],["$","div",null,{"style":"$9","children":["$","h2",null,{"style":"$a","children":"This page could not be found."}]}]]}]}]],"notFoundStyles":[],"styles":null}]}]}]}]]}],null],null],[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/css/8bcd97d831b4b57c.css","precedence":"next","crossOrigin":"$undefined"}]],"$Lb"]]]]
b:[["$","meta","0",{"name":"viewport","content":"width=device-width, initial-scale=1"}],["$","meta","1",{"charSet":"utf-8"}],["$","title","2",{"children":"Math Duel Game"}],["$","meta","3",{"name":"description","content":"1v1 Math Duel Game on Avalanche"}],["$","meta","4",{"name":"next-size-adjust"}]]
1:null
