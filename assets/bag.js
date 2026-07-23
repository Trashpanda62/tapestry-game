(function(){
  var list=document.getElementById('bag-items'),subtotalEl=document.getElementById('bag-subtotal'),shippingEl=document.getElementById('bag-shipping'),taxEl=document.getElementById('bag-tax'),totalEl=document.getElementById('bag-total'),checkout=document.getElementById('bag-checkout');
  function route(name){var base=document.querySelector('base');return new URL(name,base?base.href:location.origin+'/s/tapestry-acres/').pathname;}
  function read(){try{var value=JSON.parse(localStorage.getItem('tapestry-bag-v1')||'[]');return Array.isArray(value)?value:[];}catch(_){return [];}}
  function save(items){localStorage.setItem('tapestry-bag-v1',JSON.stringify(items));render();}
  function money(cents){return '$'+(Number(cents||0)/100).toFixed(2);}
  function renderQuote(items){
    if(!items.length){subtotalEl.textContent=shippingEl.textContent=taxEl.textContent=totalEl.textContent='—';return;}
    fetch(route('api/store/quote'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:items.map(function(item){return {sku:item.sku,quantity:item.quantity};})}),cache:'no-store'})
      .then(function(response){return response.json().then(function(data){if(!response.ok)throw new Error(data.error||'Price quote unavailable.');return data.quote;});})
      .then(function(quote){subtotalEl.textContent=money(quote.subtotalCents);shippingEl.textContent=money(quote.shippingCents);taxEl.textContent=money(quote.taxCents);totalEl.textContent=money(quote.totalCents);})
      .catch(function(){subtotalEl.textContent=shippingEl.textContent=taxEl.textContent=totalEl.textContent='Unavailable';});
  }
  function render(){
    var items=read();list.replaceChildren();
    if(!items.length){var empty=document.createElement('p');empty.className='bag-empty';empty.textContent='Your bag is empty.';var shop=document.createElement('a');shop.href=route('shop');shop.textContent='Browse the farm shop';empty.appendChild(document.createTextNode(' '));empty.appendChild(shop);list.appendChild(empty);}
    items.forEach(function(item,index){var line=document.createElement('article');line.className='bag-line';if(item.image){var image=document.createElement('img');image.src=item.image;image.alt='';line.appendChild(image);}else{line.appendChild(document.createElement('span'));}var detail=document.createElement('div');var title=document.createElement('h2');title.textContent=item.title||item.sku;detail.appendChild(title);var selection=document.createElement('p');selection.textContent=item.selection||item.sku;detail.appendChild(selection);line.appendChild(detail);var controls=document.createElement('div');controls.className='bag-controls';var minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Decrease '+(item.title||item.sku));minus.onclick=function(){if(item.quantity>1)item.quantity--;else items.splice(index,1);save(items);};var quantity=document.createElement('span');quantity.textContent=String(item.quantity);var plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Increase '+(item.title||item.sku));plus.onclick=function(){item.quantity=Math.min(24,item.quantity+1);save(items);};var remove=document.createElement('button');remove.type='button';remove.className='bag-remove';remove.textContent='Remove';remove.onclick=function(){items.splice(index,1);save(items);};controls.appendChild(minus);controls.appendChild(quantity);controls.appendChild(plus);controls.appendChild(remove);line.appendChild(controls);list.appendChild(line);});
    checkout.href=route('checkout');checkout.setAttribute('aria-disabled',String(!items.length));if(!items.length)checkout.tabIndex=-1;else checkout.removeAttribute('tabindex');renderQuote(items);
  }
  render();
}());
